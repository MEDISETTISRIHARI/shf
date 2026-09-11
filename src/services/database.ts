import { type Website, type Category } from '../types'

const DB_NAME = 'job-website-manager'
const DB_VERSION = 1
const METADATA_STORE = 'metadata'
const VAULT_STORE = 'vault'
const VAULT_RECORD_ID = 'current'
const METADATA_RECORD_ID = 'vault-metadata'

export interface VaultRecord {
  id: string
  encryptedPayload: string
  metadata: VaultMetadata
}

export interface VaultMetadata {
  version: number
  kdf: 'PBKDF2'
  iterations: number
  digest: string
  salt: string
  createdAt: string
  updatedAt: string
}

export interface VaultData {
  categories: Category[]
  websites: Website[]
  schemaVersion: number
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'))
  })
}

function transactionToPromise(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB transaction aborted'))
    transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB transaction failed'))
  })
}

export class DatabaseService {
  private db: IDBDatabase | null = null
  private openPromise: Promise<IDBDatabase> | null = null

  async open(): Promise<IDBDatabase> {
    if (this.db) return this.db
    if (this.openPromise) return this.openPromise

    this.openPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)
      request.onerror = () => {
        this.openPromise = null
        reject(request.error ?? new Error('IndexedDB open failed'))
      }
      request.onupgradeneeded = (event) => {
        const database = (event.target as IDBOpenDBRequest).result
        if (!database.objectStoreNames.contains(METADATA_STORE)) {
          database.createObjectStore(METADATA_STORE, { keyPath: 'id' })
        }
        if (!database.objectStoreNames.contains(VAULT_STORE)) {
          database.createObjectStore(VAULT_STORE, { keyPath: 'id' })
        }
      }
      request.onsuccess = () => {
        this.db = request.result
        this.db.onclose = () => {
          this.db = null
          this.openPromise = null
        }
        this.db.onversionchange = () => {
          this.db?.close()
          this.db = null
          this.openPromise = null
        }
        this.openPromise = null
        resolve(this.db)
      }
    })

    return this.openPromise
  }

  async getVaultRecord(): Promise<VaultRecord | null> {
    const db = await this.open()
    const tx = db.transaction(VAULT_STORE, 'readonly')
    const request = tx.objectStore(VAULT_STORE).get(VAULT_RECORD_ID)
    const completed = transactionToPromise(tx)
    const [result] = await Promise.all([requestToPromise(request), completed])
    return result ?? null
  }

  async getMetadata(): Promise<VaultMetadata | null> {
    const db = await this.open()
    const tx = db.transaction(METADATA_STORE, 'readonly')
    const request = tx.objectStore(METADATA_STORE).get(METADATA_RECORD_ID)
    const completed = transactionToPromise(tx)
    const [result] = await Promise.all([requestToPromise(request), completed])
    return result?.metadata ?? null
  }

  async getVaultSnapshot(): Promise<{ record: VaultRecord | null; metadata: VaultMetadata | null }> {
    const db = await this.open()
    const tx = db.transaction([VAULT_STORE, METADATA_STORE], 'readonly')
    const vaultRequest = tx.objectStore(VAULT_STORE).get(VAULT_RECORD_ID)
    const metadataRequest = tx.objectStore(METADATA_STORE).get(METADATA_RECORD_ID)
    const completed = transactionToPromise(tx)
    const [record, metadataResult] = await Promise.all([
      requestToPromise(vaultRequest),
      requestToPromise(metadataRequest),
      completed,
    ])
    return { record: record ?? null, metadata: metadataResult?.metadata ?? null }
  }

  async saveVaultRecord(record: VaultRecord): Promise<void> {
    const db = await this.open()
    const tx = db.transaction([VAULT_STORE, METADATA_STORE], 'readwrite')
    const vaultRequest = tx.objectStore(VAULT_STORE).put(record)
    const metadataRequest = tx.objectStore(METADATA_STORE).put({
      id: METADATA_RECORD_ID,
      metadata: record.metadata,
    })
    const completed = transactionToPromise(tx)
    await Promise.all([requestToPromise(vaultRequest), requestToPromise(metadataRequest), completed])
  }

  async clearVault(): Promise<void> {
    const db = await this.open()
    const tx = db.transaction([VAULT_STORE, METADATA_STORE], 'readwrite')
    const vaultRequest = tx.objectStore(VAULT_STORE).clear()
    const metadataRequest = tx.objectStore(METADATA_STORE).clear()
    const completed = transactionToPromise(tx)
    await Promise.all([requestToPromise(vaultRequest), requestToPromise(metadataRequest), completed])
  }

  async restoreVault(record: VaultRecord): Promise<void> {
    const db = await this.open()
    const tx = db.transaction([VAULT_STORE, METADATA_STORE], 'readwrite')
    const vaultRequest = tx.objectStore(VAULT_STORE).put(record)
    const metadataRequest = tx.objectStore(METADATA_STORE).put({
      id: METADATA_RECORD_ID,
      metadata: record.metadata,
    })
    const completed = transactionToPromise(tx)
    await Promise.all([requestToPromise(vaultRequest), requestToPromise(metadataRequest), completed])
  }
}

export const dbService = new DatabaseService()