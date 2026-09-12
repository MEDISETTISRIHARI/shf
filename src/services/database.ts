import { supabase } from './supabase'
import type { Category, Website } from '../types'

const DB_NAME = 'job-website-manager'
const DB_VERSION = 1
const METADATA_STORE = 'metadata'
const VAULT_STORE = 'vault'
const VAULT_RECORD_ID = 'current'
const METADATA_RECORD_ID = 'vault-metadata'

export interface VaultMetadata {
  version: number
  kdf: 'PBKDF2'
  iterations: number
  digest: string
  salt: string
  createdAt: string
  updatedAt: string
}

export interface VaultRecord {
  id: string
  encryptedPayload: string
  metadata: VaultMetadata
}

export interface VaultData {
  categories: Category[]
  websites: Website[]
  schemaVersion: number
}

export interface CloudVaultRecord {
  user_id: string
  encrypted_payload: string
  metadata: VaultMetadata
  created_at: string
  updated_at: string
}

class DatabaseService {
  private dbPromise: Promise<IDBDatabase> | null = null

  private openDatabase(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => {
        reject(request.error ?? new Error('Unable to open local database.'))
      }

      request.onupgradeneeded = () => {
        const db = request.result

        if (!db.objectStoreNames.contains(METADATA_STORE)) {
          db.createObjectStore(METADATA_STORE, { keyPath: 'id' })
        }

        if (!db.objectStoreNames.contains(VAULT_STORE)) {
          db.createObjectStore(VAULT_STORE, { keyPath: 'id' })
        }
      }

      request.onsuccess = () => {
        resolve(request.result)
      }
    })

    return this.dbPromise
  }

  async getVaultSnapshot(): Promise<{
    record: VaultRecord | null
    metadata: VaultMetadata | null
  }> {
    const db = await this.openDatabase()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(
        [VAULT_STORE, METADATA_STORE],
        'readonly',
      )

      const vaultStore = transaction.objectStore(VAULT_STORE)
      const metadataStore = transaction.objectStore(METADATA_STORE)

      const vaultRequest = vaultStore.get(VAULT_RECORD_ID)
      const metadataRequest = metadataStore.get(METADATA_RECORD_ID)

      transaction.onerror = () => {
        reject(transaction.error ?? new Error('Unable to read local vault.'))
      }

      transaction.oncomplete = () => {
        resolve({
          record: vaultRequest.result ?? null,
          metadata: metadataRequest.result?.metadata ?? null,
        })
      }
    })
  }

  async saveVaultRecord(record: VaultRecord): Promise<void> {
    const db = await this.openDatabase()

    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(
        [VAULT_STORE, METADATA_STORE],
        'readwrite',
      )

      const vaultStore = transaction.objectStore(VAULT_STORE)
      const metadataStore = transaction.objectStore(METADATA_STORE)

      vaultStore.put(record)

      metadataStore.put({
        id: METADATA_RECORD_ID,
        metadata: record.metadata,
      })

      transaction.onerror = () => {
        reject(transaction.error ?? new Error('Unable to save local vault.'))
      }

      transaction.oncomplete = () => {
        resolve()
      }
    })
  }

  async getCloudVault(userId: string): Promise<CloudVaultRecord | null> {
    const { data, error } = await supabase
      .from('user_vaults')
      .select(
        'user_id, encrypted_payload, metadata, created_at, updated_at',
      )
      .eq('user_id', userId)
      .maybeSingle()

    if (error) {
      throw new Error(`Unable to load cloud vault: ${error.message}`)
    }

    return data as CloudVaultRecord | null
  }

  async saveCloudVault(
    userId: string,
    record: VaultRecord,
  ): Promise<CloudVaultRecord> {
    const { data, error } = await supabase
      .from('user_vaults')
      .upsert(
        {
          user_id: userId,
          encrypted_payload: record.encryptedPayload,
          metadata: record.metadata,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id',
        },
      )
      .select(
        'user_id, encrypted_payload, metadata, created_at, updated_at',
      )
      .single()

    if (error) {
      throw new Error(`Unable to save cloud vault: ${error.message}`)
    }

    return data as CloudVaultRecord
  }

  cloudToVaultRecord(record: CloudVaultRecord): VaultRecord {
    return {
      id: VAULT_RECORD_ID,
      encryptedPayload: record.encrypted_payload,
      metadata: record.metadata,
    }
  }
}

export const dbService = new DatabaseService()