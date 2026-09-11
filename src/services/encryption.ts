import { type VaultMetadata, type VaultData } from './database'

const ENCRYPTION_ALGO = 'AES-GCM'
const DERIVATION_ALGO = 'PBKDF2'
const DIGEST = 'SHA-256'
const DEFAULT_ITERATIONS = 100000
const SALT_LENGTH = 16
const IV_LENGTH = 12
const SCHEMA_VERSION = 1

export class EncryptionService {
  static createMetadata(): Omit<VaultMetadata, 'salt' | 'createdAt' | 'updatedAt'> {
    return {
      version: SCHEMA_VERSION,
      kdf: 'PBKDF2',
      iterations: DEFAULT_ITERATIONS,
      digest: DIGEST,
    }
  }

  static generateSalt(): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(SALT_LENGTH))
  }

  static async deriveKey(
    masterPassword: string,
    salt: Uint8Array,
    iterations: number
  ): Promise<CryptoKey> {
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(masterPassword),
      { name: DERIVATION_ALGO },
      false,
      ['deriveBits', 'deriveKey']
    )

    return crypto.subtle.deriveKey(
      {
        name: DERIVATION_ALGO,
        salt: salt as BufferSource,
        iterations,
        hash: DIGEST,
      },
      keyMaterial,
      { name: ENCRYPTION_ALGO, length: 256 },
      false,
      ['encrypt', 'decrypt']
    )
  }

  static async encryptVault(
    data: VaultData,
    masterPassword: string
  ): Promise<{ payload: string; metadata: VaultMetadata }> {
    const salt = this.generateSalt()
    const metadataBase = this.createMetadata()
    const metadata: VaultMetadata = {
      ...metadataBase,
      salt: this.toHex(salt),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const key = await this.deriveKey(masterPassword, salt, metadata.iterations)
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))

    const payload = JSON.stringify(data)
    const encrypted = await crypto.subtle.encrypt(
      { name: ENCRYPTION_ALGO, iv: iv as BufferSource },
      key,
      new TextEncoder().encode(payload)
    )

    const payloadString = this.toHex(iv) + ':' + this.toHex(new Uint8Array(encrypted))

    return { payload: payloadString, metadata }
  }

  static async decryptVault(
    payload: string,
    metadata: VaultMetadata,
    masterPassword: string
  ): Promise<VaultData> {
    const salt = this.fromHex(metadata.salt)
    const key = await this.deriveKey(masterPassword, salt, metadata.iterations)

    const [ivHex, ciphertextHex] = payload.split(':')
    const iv = this.fromHex(ivHex)
    const ciphertext = this.fromHex(ciphertextHex)

    const decrypted = await crypto.subtle.decrypt(
      { name: ENCRYPTION_ALGO, iv: iv as BufferSource },
      key,
      ciphertext as BufferSource
    )

    const json = new TextDecoder().decode(decrypted)
    return JSON.parse(json) as VaultData
  }

  static async encryptExistingData(
    data: VaultData,
    masterPassword: string,
    createdAt?: string
  ): Promise<{ payload: string; metadata: VaultMetadata }> {
    const salt = this.generateSalt()
    const base = this.createMetadata()
    const metadata: VaultMetadata = {
      ...base,
      salt: this.toHex(salt),
      createdAt: createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const key = await this.deriveKey(masterPassword, salt, metadata.iterations)
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))

    const payload = JSON.stringify(data)
    const encrypted = await crypto.subtle.encrypt(
      { name: ENCRYPTION_ALGO, iv: iv as BufferSource },
      key,
      new TextEncoder().encode(payload)
    )

    const payloadString = this.toHex(iv) + ':' + this.toHex(new Uint8Array(encrypted))

    return { payload: payloadString, metadata }
  }

  static async changePassword(
    encryptedPayload: string,
    currentPassword: string,
    newPassword: string,
    currentMetadata: VaultMetadata
  ): Promise<{ payload: string; metadata: VaultMetadata }> {
    const decrypted = await this.decryptVault(encryptedPayload, currentMetadata, currentPassword)

    const salt = this.generateSalt()
    const metadata: VaultMetadata = {
      ...this.createMetadata(),
      salt: this.toHex(salt),
      createdAt: currentMetadata.createdAt,
      updatedAt: new Date().toISOString(),
    }

    const key = await this.deriveKey(newPassword, salt, metadata.iterations)
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))

    const payload = JSON.stringify(decrypted)
    const encrypted = await crypto.subtle.encrypt(
      { name: ENCRYPTION_ALGO, iv: iv as BufferSource },
      key,
      new TextEncoder().encode(payload)
    )

    const payloadString = this.toHex(iv) + ':' + this.toHex(new Uint8Array(encrypted))

    return { payload: payloadString, metadata }
  }

  static toHex(bytes: Uint8Array): string {
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  }

  static fromHex(hex: string): Uint8Array {
    const clean = hex.replace(/[^0-9a-fA-F]/g, '')
    const bytes = new Uint8Array(clean.length / 2)
    for (let i = 0; i < clean.length; i += 2) {
      bytes[i / 2] = parseInt(clean.slice(i, i + 2), 16)
    }
    return bytes
  }

  static isValidUrl(url: string): boolean {
    try {
      const parsed = new URL(url)
      return parsed.protocol === 'http:' || parsed.protocol === 'https:'
    } catch {
      return false
    }
  }

  static ensureUrl(url: string): string {
    if (this.isValidUrl(url)) return url
    const withProtocol = url.startsWith('http://') || url.startsWith('https://')
      ? url
      : 'https://' + url
    if (this.isValidUrl(withProtocol)) return withProtocol
    throw new Error('Invalid URL')
  }
}

export const encryptionService = EncryptionService
export { DEFAULT_ITERATIONS, SCHEMA_VERSION }