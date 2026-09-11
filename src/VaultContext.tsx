import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
} from 'react'
import type { ReactNode } from 'react'
import { type Website, type Category, type ToastMessage } from './types'
import {
  type VaultData,
  type VaultRecord,
  type VaultMetadata,
  dbService,
} from './services/database'
import { EncryptionService } from './services/encryption'
import { backupService } from './services/backup'
import { supabase } from './services/supabase'
import type { User } from '@supabase/supabase-js'

interface VaultContextType {
  unlocked: boolean
  vaultExists: boolean
  authenticated: boolean
  userEmail: string | null
  categories: Category[]
  websites: Website[]
  loading: boolean
  error: string | null
  toasts: ToastMessage[]
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  initializeVault: (masterPassword: string) => Promise<void>
  unlockVault: (masterPassword: string) => Promise<void>
  lockVault: () => void
  clearError: () => void
  createCategory: (name: string) => Promise<void>
  updateCategory: (id: string, name: string) => Promise<void>
  deleteCategory: (id: string) => Promise<void>
  addWebsite: (
    categoryId: string,
    website: Omit<Website, 'id' | 'categoryId' | 'createdAt' | 'updatedAt'>,
  ) => Promise<void>
  updateWebsite: (
    id: string,
    updates: Partial<
      Omit<Website, 'id' | 'categoryId' | 'createdAt' | 'updatedAt'>
    >,
  ) => Promise<void>
  deleteWebsite: (id: string) => Promise<void>
  toggleFavorite: (id: string) => Promise<void>
  changeMasterPassword: (current: string, newPassword: string) => Promise<void>
  exportBackup: () => void
  importBackup: (file: File, masterPassword: string) => Promise<void>
  addToast: (
    message: string,
    type?: 'info' | 'success' | 'error',
  ) => void
  removeToast: (id: string) => void
}

const VaultContext = createContext<VaultContextType | undefined>(undefined)

const INITIAL_VAULT_DATA: VaultData = {
  categories: [],
  websites: [],
  schemaVersion: 1,
}

function generateId(): string {
  return crypto.randomUUID?.() ?? Math.random().toString(36).slice(2, 12)
}

function sortCategories(categories: Category[]): Category[] {
  return [...categories].sort((a, b) => a.order - b.order)
}

function sortWebsites(websites: Website[]): Website[] {
  return [...websites].sort((a, b) => {
    if (a.favorite !== b.favorite) return b.favorite ? -1 : 1
    return a.name.localeCompare(b.name)
  })
}

function isValidVaultData(data: unknown): data is VaultData {
  if (!data || typeof data !== 'object') return false
  const candidate = data as Partial<VaultData>
  return (
    Array.isArray(candidate.categories) &&
    Array.isArray(candidate.websites) &&
    typeof candidate.schemaVersion === 'number'
  )
}

export function VaultProvider({ children }: { children: ReactNode }) {
  const [unlocked, setUnlocked] = useState(false)
  const [vaultExists, setVaultExists] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [websites, setWebsites] = useState<Website[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const decryptedDataRef = useRef<VaultData | null>(null)
  const metadataRef = useRef<VaultMetadata | null>(null)
  const recordRef = useRef<VaultRecord | null>(null)
  const passwordRef = useRef<string | null>(null)
  const userRef = useRef<User | null>(null)

  const addToast = useCallback(
    (message: string, type: 'info' | 'success' | 'error' = 'info') => {
      const id = generateId()
      setToasts((prev) => [...prev, { id, message, type }])
    },
    [],
  )

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const clearError = useCallback(() => setError(null), [])

  const syncUI = useCallback((data: VaultData) => {
    setCategories(sortCategories(data.categories))
    setWebsites(sortWebsites(data.websites))
  }, [])

  const loadVaultForUser = useCallback(
    async (currentUser: User) => {
      setLoading(true)
      setError(null)

      try {
        const cloud = await dbService.getCloudVault(currentUser.id)

        if (cloud) {
          const record = dbService.cloudToVaultRecord(cloud)
          await dbService.saveVaultRecord(record)

          recordRef.current = record
          metadataRef.current = record.metadata
          setVaultExists(true)
          return
        }

        // First login on an account: migrate the existing local vault if one exists.
        const local = await dbService.getVaultSnapshot()

        if (local.record && local.metadata) {
          const record: VaultRecord = {
            id: 'current',
            encryptedPayload: local.record.encryptedPayload,
            metadata: local.metadata,
          }

          await dbService.saveCloudVault(currentUser.id, record)
          recordRef.current = record
          metadataRef.current = record.metadata
          setVaultExists(true)
          addToast('Your existing local vault was moved to the cloud.', 'success')
          return
        }

        recordRef.current = null
        metadataRef.current = null
        setVaultExists(false)
      } catch (err) {
        console.error('Failed to load cloud vault:', err)
        setError(
          err instanceof Error
            ? err.message
            : 'Unable to connect to the cloud vault.',
        )
        setVaultExists(false)
      } finally {
        setLoading(false)
      }
    },
    [addToast],
  )

  useEffect(() => {
    let mounted = true

    const initializeAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!mounted) return

      userRef.current = session?.user ?? null
      setUser(session?.user ?? null)

      if (session?.user) {
        await loadVaultForUser(session.user)
      } else {
        const local = await dbService.getVaultSnapshot().catch(() => null)
        if (mounted) {
          setVaultExists(Boolean(local?.record && local?.metadata))
          setLoading(false)
        }
      }
    }

    void initializeAuth()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null
      userRef.current = nextUser
      setUser(nextUser)

      if (!nextUser) {
        passwordRef.current = null
        decryptedDataRef.current = null
        metadataRef.current = null
        recordRef.current = null
        setUnlocked(false)
        setCategories([])
        setWebsites([])
        setVaultExists(false)
        setLoading(false)
        return
      }

      setTimeout(() => {
        void loadVaultForUser(nextUser)
      }, 0)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [loadVaultForUser])

  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel(`shf-vault-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vaults',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const row = payload.new as {
            user_id?: string
            encrypted_payload?: string
            metadata?: VaultMetadata
          }

          if (!row.encrypted_payload || !row.metadata) {
            return
          }

          const incoming: VaultRecord = {
            id: 'current',
            encryptedPayload: row.encrypted_payload,
            metadata: row.metadata,
          }

          // Ignore the realtime echo of our own save.
          if (
            recordRef.current?.encryptedPayload === incoming.encryptedPayload
          ) {
            return
          }

          recordRef.current = incoming
          metadataRef.current = incoming.metadata
          setVaultExists(true)
          void dbService.saveVaultRecord(incoming)

          const password = passwordRef.current

          if (!password) {
            return
          }

          void (async () => {
            try {
              const decrypted = await EncryptionService.decryptVault(
                incoming.encryptedPayload,
                incoming.metadata,
                password,
              )

              if (!isValidVaultData(decrypted)) {
                throw new Error('Corrupt vault data')
              }

              decryptedDataRef.current = decrypted
              syncUI(decrypted)
              addToast('Vault synchronized from another device.', 'success')
            } catch {
              // A remote master-password change makes the old local password
              // unable to decrypt the new vault. Lock and require the new one.
              passwordRef.current = null
              decryptedDataRef.current = null
              setUnlocked(false)
              setCategories([])
              setWebsites([])
              addToast(
                'The vault changed on another device. Unlock again with the current master password.',
                'info',
              )
            }
          })()
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [user, syncUI, addToast])

  const persistVault = useCallback(
    async (data: VaultData): Promise<boolean> => {
      const password = passwordRef.current

      if (!password) {
        setError('Vault is locked. Please unlock it before saving changes.')
        return false
      }

      try {
        const { payload, metadata } =
          await EncryptionService.encryptVault(data, password)

        const record: VaultRecord = {
          id: 'current',
          encryptedPayload: payload,
          metadata,
        }

        await dbService.saveVaultRecord(record)

        if (userRef.current) {
          await dbService.saveCloudVault(userRef.current.id, record)
        }

        recordRef.current = record
        metadataRef.current = metadata
        decryptedDataRef.current = data
        syncUI(data)
        return true
      } catch (err) {
        console.error('Failed to save vault:', err)
        setError(
          err instanceof Error
            ? err.message
            : 'Unable to save changes. Please try again.',
        )
        return false
      }
    },
    [syncUI],
  )

  const signIn = async (email: string, password: string) => {
    setLoading(true)
    setError(null)

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (authError) throw authError
      addToast('Signed in successfully.', 'success')
    } catch (err) {
      console.error('Sign in failed:', err)
      setError(
        err instanceof Error ? err.message : 'Unable to sign in.',
      )
    } finally {
      setLoading(false)
    }
  }

  const signUp = async (email: string, password: string) => {
    setLoading(true)
    setError(null)

    try {
      if (password.length < 8) {
        throw new Error('Account password must be at least 8 characters.')
      }

      const { data, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      })

      if (authError) throw authError

      if (data.session) {
        addToast('Account created successfully.', 'success')
      } else {
        addToast(
          'Account created. Check your email to confirm your account, then sign in.',
          'success',
        )
      }
    } catch (err) {
      console.error('Sign up failed:', err)
      setError(
        err instanceof Error ? err.message : 'Unable to create account.',
      )
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    setLoading(true)

    try {
      const { error: authError } = await supabase.auth.signOut()
      if (authError) throw authError
      addToast('Signed out.', 'info')
    } catch (err) {
      console.error('Sign out failed:', err)
      setError(err instanceof Error ? err.message : 'Unable to sign out.')
    } finally {
      setLoading(false)
    }
  }

  const initializeVault = async (masterPassword: string) => {
    try {
      if (!userRef.current) {
        throw new Error('Please sign in to your SHF account first.')
      }

      if (masterPassword.length < 8) {
        throw new Error('Master password must be at least 8 characters')
      }

      const existing = await dbService.getCloudVault(userRef.current.id)

      if (existing) {
        throw new Error('A cloud vault already exists')
      }

      const { payload, metadata } = await EncryptionService.encryptVault(
        INITIAL_VAULT_DATA,
        masterPassword,
      )

      const record: VaultRecord = {
        id: 'current',
        encryptedPayload: payload,
        metadata,
      }

      await dbService.saveVaultRecord(record)
      await dbService.saveCloudVault(userRef.current.id, record)

      passwordRef.current = masterPassword
      recordRef.current = record
      metadataRef.current = metadata
      decryptedDataRef.current = INITIAL_VAULT_DATA

      setUnlocked(true)
      setVaultExists(true)
      setCategories([])
      setWebsites([])
      addToast('Vault created successfully', 'success')
      setError(null)
    } catch (err) {
      console.error('Vault initialization failed:', err)
      setError(err instanceof Error ? err.message : 'Failed to create vault.')
    }
  }

  const unlockVault = async (masterPassword: string) => {
    try {
      if (!userRef.current) {
        setError('Please sign in to your SHF account first.')
        return
      }

      let record = recordRef.current
      let metadata = metadataRef.current

      if (!record || !metadata) {
        const cloud = await dbService.getCloudVault(userRef.current.id)

        if (!cloud) {
          setError('No vault found. Please create a vault first.')
          return
        }

        record = dbService.cloudToVaultRecord(cloud)
        metadata = record.metadata
        recordRef.current = record
        metadataRef.current = metadata
      }

      let data: VaultData

      try {
        const decrypted = await EncryptionService.decryptVault(
          record.encryptedPayload,
          metadata,
          masterPassword,
        )

        if (!isValidVaultData(decrypted)) {
          throw new Error('Corrupt vault data')
        }

        data = decrypted
      } catch {
        throw new Error('Incorrect master password')
      }

      passwordRef.current = masterPassword
      decryptedDataRef.current = data
      setUnlocked(true)
      setVaultExists(true)
      syncUI(data)
      setError(null)
      addToast('Vault unlocked', 'success')
    } catch (err) {
      console.error('Unlock failed:', err)
      setError(err instanceof Error ? err.message : 'Failed to unlock vault')
    }
  }

  const lockVault = () => {
    passwordRef.current = null
    decryptedDataRef.current = null
    metadataRef.current = null
    recordRef.current = null
    setUnlocked(false)
    setCategories([])
    setWebsites([])
  }

  const createCategory = async (name: string) => {
    const current = decryptedDataRef.current
    if (!current) return

    const trimmed = name.trim()
    if (!trimmed) {
      setError('Category name is required')
      return
    }

    if (
      current.categories.some(
        (c) => c.name.toLowerCase() === trimmed.toLowerCase(),
      )
    ) {
      setError('A category with this name already exists')
      return
    }

    const now = new Date().toISOString()
    const maxOrder = current.categories.reduce(
      (max, c) => Math.max(max, c.order),
      -1,
    )

    const newCategory: Category = {
      id: generateId(),
      name: trimmed,
      order: maxOrder + 1,
      createdAt: now,
      updatedAt: now,
    }

    const data: VaultData = {
      ...current,
      categories: [...current.categories, newCategory],
      websites: current.websites,
    }

    if (await persistVault(data)) {
      addToast(`Category "${trimmed}" created`, 'success')
    }
  }

  const updateCategory = async (id: string, name: string) => {
    const current = decryptedDataRef.current
    if (!current) return

    const trimmed = name.trim()
    if (!trimmed) {
      setError('Category name is required')
      return
    }

    if (
      current.categories.some(
        (c) =>
          c.id !== id && c.name.toLowerCase() === trimmed.toLowerCase(),
      )
    ) {
      setError('A category with this name already exists')
      return
    }

    const data: VaultData = {
      ...current,
      categories: current.categories.map((c) =>
        c.id === id
          ? { ...c, name: trimmed, updatedAt: new Date().toISOString() }
          : c,
      ),
      websites: current.websites,
    }

    if (await persistVault(data)) {
      addToast('Category updated', 'success')
    }
  }

  const deleteCategory = async (id: string) => {
    const current = decryptedDataRef.current
    if (!current) return

    const data: VaultData = {
      ...current,
      categories: current.categories.filter((c) => c.id !== id),
      websites: current.websites.filter((w) => w.categoryId !== id),
    }

    if (await persistVault(data)) {
      addToast('Category deleted', 'success')
    }
  }

  const addWebsite = async (
    categoryId: string,
    website: Omit<Website, 'id' | 'categoryId' | 'createdAt' | 'updatedAt'>,
  ) => {
    const current = decryptedDataRef.current
    if (!current) return

    const trimmed = trimWebsiteInput(website)

    if (!trimmed.name) {
      setError('Website name is required')
      return
    }

    if (!trimmed.url) {
      setError('Website URL is required')
      return
    }

    if (!EncryptionService.isValidUrl(trimmed.url)) {
      setError('Please enter a valid HTTP or HTTPS URL')
      return
    }

    if (!current.categories.some((c) => c.id === categoryId)) {
      setError('Selected category does not exist')
      return
    }

    const now = new Date().toISOString()

    const newWebsite: Website = {
      id: generateId(),
      categoryId,
      name: trimmed.name,
      url: trimmed.url,
      loginId: trimmed.loginId,
      password: trimmed.password,
      description: trimmed.description,
      favorite: trimmed.favorite,
      createdAt: now,
      updatedAt: now,
    }

    const data: VaultData = {
      ...current,
      categories: current.categories,
      websites: [...current.websites, newWebsite],
    }

    if (await persistVault(data)) {
      addToast(`Website "${trimmed.name}" added`, 'success')
    }
  }

  const updateWebsite = async (
    id: string,
    updates: Partial<
      Omit<Website, 'id' | 'categoryId' | 'createdAt' | 'updatedAt'>
    >,
  ) => {
    const current = decryptedDataRef.current
    if (!current) return

    const website = current.websites.find((w) => w.id === id)
    if (!website) {
      setError('Website not found')
      return
    }

    const updated: Website = {
      ...website,
      ...updates,
      updatedAt: new Date().toISOString(),
    }

    if (!updated.name.trim()) {
      setError('Website name is required')
      return
    }

    if (!updated.url.trim()) {
      setError('Website URL is required')
      return
    }

    if (!EncryptionService.isValidUrl(updated.url.trim())) {
      setError('Please enter a valid HTTP or HTTPS URL')
      return
    }

    updated.url = updated.url.trim()
    updated.loginId = updated.loginId.trim()
    updated.name = updated.name.trim()
    updated.description = updated.description?.trim() ?? ''

    const data: VaultData = {
      ...current,
      categories: current.categories,
      websites: current.websites.map((w) => (w.id === id ? updated : w)),
    }

    if (await persistVault(data)) {
      addToast('Website updated', 'success')
    }
  }

  const deleteWebsite = async (id: string) => {
    const current = decryptedDataRef.current
    if (!current) return

    const data: VaultData = {
      ...current,
      categories: current.categories,
      websites: current.websites.filter((w) => w.id !== id),
    }

    if (await persistVault(data)) {
      addToast('Website deleted', 'success')
    }
  }

  const toggleFavorite = async (id: string) => {
    const current = decryptedDataRef.current
    if (!current) return

    const data: VaultData = {
      ...current,
      categories: current.categories,
      websites: current.websites.map((w) =>
        w.id === id
          ? {
              ...w,
              favorite: !w.favorite,
              updatedAt: new Date().toISOString(),
            }
          : w,
      ),
    }

    await persistVault(data)
  }

  const changeMasterPassword = async (
    current: string,
    newPassword: string,
  ) => {
    const record = recordRef.current
    const metadata = metadataRef.current
    const accountUser = userRef.current

    if (!record || !metadata || !accountUser) {
      setError('Vault must be unlocked to change password')
      return
    }

    if (newPassword.length < 8) {
      setError('New master password must be at least 8 characters')
      return
    }

    try {
      const { payload, metadata: newMetadata } =
        await EncryptionService.changePassword(
          record.encryptedPayload,
          current,
          newPassword,
          metadata,
        )

      const newRecord: VaultRecord = {
        id: 'current',
        encryptedPayload: payload,
        metadata: newMetadata,
      }

      await dbService.saveVaultRecord(newRecord)
      await dbService.saveCloudVault(accountUser.id, newRecord)

      recordRef.current = newRecord
      metadataRef.current = newMetadata
      passwordRef.current = newPassword

      addToast('Master password changed successfully', 'success')
      setError(null)
    } catch (err) {
      console.error('Change password failed:', err)
      setError(
        'Current master password is incorrect or the vault could not be updated.',
      )
    }
  }

  const exportBackup = () => {
    const record = recordRef.current
    if (!record) {
      addToast('No data to export', 'info')
      return
    }

    try {
      backupService.downloadBackup(record)
      addToast('Backup exported successfully', 'success')
    } catch (err) {
      console.error('Export failed:', err)
      setError('Unable to export backup. Please try again.')
    }
  }

  const importBackup = async (file: File, masterPassword: string) => {
    const password = passwordRef.current
    if (!password) {
      setError('Vault must be unlocked to import backup')
      return
    }

    let backup
    try {
      backup = await backupService.readBackupFile(file)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid backup file'
      setError(message)
      return
    }

    let recovered: VaultData
    try {
      const decrypted = await EncryptionService.decryptVault(
        backup.vault.encryptedPayload,
        backup.vault.metadata,
        masterPassword,
      )

      if (!isValidVaultData(decrypted)) {
        throw new Error('Corrupt backup data')
      }

      recovered = decrypted
    } catch {
      setError('Incorrect master password for this backup')
      return
    }

    try {
      const { payload, metadata } =
        await EncryptionService.encryptVault(recovered, password)

      const newRecord: VaultRecord = {
        id: 'current',
        encryptedPayload: payload,
        metadata,
      }

      await dbService.saveVaultRecord(newRecord)

      if (userRef.current) {
        await dbService.saveCloudVault(userRef.current.id, newRecord)
      }

      recordRef.current = newRecord
      metadataRef.current = metadata
      decryptedDataRef.current = recovered
      syncUI(recovered)
      addToast('Backup restored successfully', 'success')
      setError(null)
    } catch (err) {
      console.error('Restore failed:', err)
      setError('Failed to restore backup')
    }
  }

  const value: VaultContextType = {
    unlocked,
    vaultExists,
    authenticated: Boolean(user),
    userEmail: user?.email ?? null,
    categories,
    websites,
    loading,
    error,
    toasts,
    signIn,
    signUp,
    signOut,
    initializeVault,
    unlockVault,
    lockVault,
    clearError,
    createCategory,
    updateCategory,
    deleteCategory,
    addWebsite,
    updateWebsite,
    deleteWebsite,
    toggleFavorite,
    changeMasterPassword,
    exportBackup,
    importBackup,
    addToast,
    removeToast,
  }

  return (
    <VaultContext.Provider value={value}>{children}</VaultContext.Provider>
  )
}

function trimWebsiteInput(
  website: Omit<Website, 'id' | 'categoryId' | 'createdAt' | 'updatedAt'>,
): Omit<Website, 'id' | 'categoryId' | 'createdAt' | 'updatedAt'> {
  return {
    name: website.name.trim(),
    url: website.url.trim(),
    loginId: website.loginId.trim(),
    password: website.password,
    description: (website.description ?? '').trim(),
    favorite: website.favorite,
  }
}

export function useVault() {
  const context = useContext(VaultContext)
  if (!context) {
    throw new Error('useVault must be used within a VaultProvider')
  }
  return context
}
