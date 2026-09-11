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
import { type VaultData, type VaultRecord, type VaultMetadata, dbService } from './services/database'
import { EncryptionService } from './services/encryption'
import { backupService } from './services/backup'

interface VaultContextType {
  unlocked: boolean
  vaultExists: boolean
  categories: Category[]
  websites: Website[]
  loading: boolean
  error: string | null
  toasts: ToastMessage[]
  initializeVault: (masterPassword: string) => Promise<void>
  unlockVault: (masterPassword: string) => Promise<void>
  lockVault: () => void
  clearError: () => void
  createCategory: (name: string) => Promise<void>
  updateCategory: (id: string, name: string) => Promise<void>
  deleteCategory: (id: string) => Promise<void>
  addWebsite: (categoryId: string, website: Omit<Website, 'id' | 'categoryId' | 'createdAt' | 'updatedAt'>) => Promise<void>
  updateWebsite: (id: string, updates: Partial<Omit<Website, 'id' | 'categoryId' | 'createdAt' | 'updatedAt'>>) => Promise<void>
  deleteWebsite: (id: string) => Promise<void>
  toggleFavorite: (id: string) => Promise<void>
  changeMasterPassword: (current: string, newPassword: string) => Promise<void>
  exportBackup: () => void
  importBackup: (file: File, masterPassword: string) => Promise<void>
  addToast: (message: string, type?: 'info' | 'success' | 'error') => void
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
    if (a.favorite !== b.favorite) {
      return b.favorite ? -1 : 1
    }
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
  const [categories, setCategories] = useState<Category[]>([])
  const [websites, setWebsites] = useState<Website[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const decryptedDataRef = useRef<VaultData | null>(null)
  const metadataRef = useRef<VaultMetadata | null>(null)
  const recordRef = useRef<VaultRecord | null>(null)
  const passwordRef = useRef<string | null>(null)

  const addToast = useCallback((message: string, type: 'info' | 'success' | 'error' = 'info') => {
    const id = generateId()
    setToasts((prev) => [...prev, { id, message, type }])
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const clearError = useCallback(() => setError(null), [])

  const syncUI = useCallback((data: VaultData) => {
    setCategories(sortCategories(data.categories))
    setWebsites(sortWebsites(data.websites))
  }, [])

  const checkVaultExists = useCallback(async () => {
    try {
      setLoading(true)
      const { record, metadata } = await dbService.getVaultSnapshot()
      setVaultExists(Boolean(record && metadata))
      if (metadata && !record) {
        setError('Vault data is incomplete. Restore a backup to continue.')
      }
    } catch (err) {
      console.error('Failed to check vault:', err)
      setError('Failed to access local storage. Please reload the page.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    checkVaultExists()
  }, [checkVaultExists])

  const persistVault = useCallback(async (data: VaultData): Promise<boolean> => {
    const password = passwordRef.current
    if (!password) {
      setError('Vault is locked. Please unlock it before saving changes.')
      return false
    }

    try {
      const { payload, metadata } = await EncryptionService.encryptVault(data, password)
      const record: VaultRecord = { id: 'current', encryptedPayload: payload, metadata }
      await dbService.saveVaultRecord(record)
      recordRef.current = record
      metadataRef.current = metadata
      decryptedDataRef.current = data
      syncUI(data)
      return true
    } catch (err) {
      console.error('Failed to save vault:', err)
      setError('Unable to save changes. Please try again.')
      return false
    }
  }, [syncUI])

  const initializeVault = async (masterPassword: string) => {
    try {
      if (masterPassword.length < 8) {
        throw new Error('Master password must be at least 8 characters')
      }
      const existing = await dbService.getVaultSnapshot()
      if (existing.record || existing.metadata) {
        throw new Error('A vault already exists')
      }

      const { payload, metadata } = await EncryptionService.encryptVault(INITIAL_VAULT_DATA, masterPassword)
      const record: VaultRecord = { id: 'current', encryptedPayload: payload, metadata }
      await dbService.saveVaultRecord(record)

      passwordRef.current = masterPassword
      recordRef.current = record
      metadataRef.current = metadata
      decryptedDataRef.current = INITIAL_VAULT_DATA
      setUnlocked(true)
      setVaultExists(true)
      setCategories([])
      setWebsites([])
      addToast('Vault created successfully', 'success')
    } catch (err) {
      console.error('Vault initialization failed:', err)
      setError('Failed to create vault. Please try again.')
    }
  }

  const unlockVault = async (masterPassword: string) => {
    try {
      const { record, metadata } = await dbService.getVaultSnapshot()
      if (!record || !metadata) {
        setError('No vault found. Please create a vault first.')
        return
      }

      let data: VaultData
      try {
        const decrypted = await EncryptionService.decryptVault(
          record.encryptedPayload,
          metadata,
          masterPassword
        )
        if (!isValidVaultData(decrypted)) {
          throw new Error('Corrupt vault data')
        }
        data = decrypted
      } catch {
        throw new Error('Incorrect master password')
      }

      passwordRef.current = masterPassword
      recordRef.current = record
      metadataRef.current = metadata
      decryptedDataRef.current = data
      setUnlocked(true)
      setVaultExists(true)
      syncUI(data)
      addToast('Vault unlocked', 'success')
      setError(null)
    } catch (err) {
      console.error('Unlock failed:', err)
      const message = err instanceof Error ? err.message : 'Failed to unlock vault'
      setError(message)
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
    if (current.categories.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) {
      setError('A category with this name already exists')
      return
    }
    const maxOrder = current.categories.reduce((max, c) => Math.max(max, c.order), -1)
    const newCategory: Category = {
      id: generateId(),
      name: trimmed,
      order: maxOrder + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
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
    if (current.categories.some((c) => c.id !== id && c.name.toLowerCase() === trimmed.toLowerCase())) {
      setError('A category with this name already exists')
      return
    }
    const data: VaultData = {
      ...current,
      categories: current.categories.map((c) =>
        c.id === id
          ? { ...c, name: trimmed, updatedAt: new Date().toISOString() }
          : c
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

  const addWebsite = async (categoryId: string, website: Omit<Website, 'id' | 'categoryId' | 'createdAt' | 'updatedAt'>) => {
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

    const newWebsite: Website = {
      id: generateId(),
      categoryId,
      name: trimmed.name,
      url: trimmed.url,
      loginId: trimmed.loginId,
      password: trimmed.password,
      description: trimmed.description,
      favorite: trimmed.favorite,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
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

  const updateWebsite = async (id: string, updates: Partial<Omit<Website, 'id' | 'categoryId' | 'createdAt' | 'updatedAt'>>) => {
    const current = decryptedDataRef.current
    if (!current) return
    const website = current.websites.find((w) => w.id === id)
    if (!website) {
      setError('Website not found')
      return
    }

    const updated: Website = { ...website, ...updates, updatedAt: new Date().toISOString() }
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
        w.id === id ? { ...w, favorite: !w.favorite, updatedAt: new Date().toISOString() } : w
      ),
    }
    await persistVault(data)
  }

  const changeMasterPassword = async (current: string, newPassword: string) => {
    const record = recordRef.current
    const metadata = metadataRef.current
    if (!record || !metadata) {
      setError('Vault must be unlocked to change password')
      return
    }
    if (newPassword.length < 8) {
      setError('New master password must be at least 8 characters')
      return
    }

    try {
      const { payload, metadata: newMetadata } = await EncryptionService.changePassword(
        record.encryptedPayload,
        current,
        newPassword,
        metadata
      )
      const newRecord: VaultRecord = { id: 'current', encryptedPayload: payload, metadata: newMetadata }
      await dbService.saveVaultRecord(newRecord)
      recordRef.current = newRecord
      metadataRef.current = newMetadata
      passwordRef.current = newPassword
      addToast('Master password changed successfully', 'success')
      setError(null)
    } catch (err) {
      console.error('Change password failed:', err)
      setError('Current master password is incorrect or the vault could not be updated.')
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
        masterPassword
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
      const { payload, metadata } = await EncryptionService.encryptVault(recovered, password)
      const newRecord: VaultRecord = { id: 'current', encryptedPayload: payload, metadata }
      await dbService.saveVaultRecord(newRecord)
      recordRef.current = newRecord
      metadataRef.current = metadata
      decryptedDataRef.current = recovered
      syncUI(recovered)
      addToast('Backup restored successfully', 'success')
    } catch (err) {
      console.error('Restore failed:', err)
      setError('Failed to restore backup')
    }
  }

  return (
    <VaultContext.Provider
      value={{
        unlocked,
        vaultExists,
        categories,
        websites,
        loading,
        error,
        toasts,
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
      }}
    >
      {children}
    </VaultContext.Provider>
  )
}

function trimWebsiteInput(website: Omit<Website, 'id' | 'categoryId' | 'createdAt' | 'updatedAt'>): Omit<Website, 'id' | 'categoryId' | 'createdAt' | 'updatedAt'> {
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