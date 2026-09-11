import { type VaultRecord } from './database'

export interface BackupFile {
  application: string
  version: number
  exportedAt: string
  vault: VaultRecord
}

const APP_NAME = 'Job Website Manager'
const BACKUP_VERSION = 1

export class BackupService {
  static exportBackup(record: VaultRecord): string {
    const backup: BackupFile = {
      application: APP_NAME,
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      vault: record,
    }
    return JSON.stringify(backup)
  }

  static parseBackup(blob: string): BackupFile {
    let parsed: unknown
    try {
      parsed = JSON.parse(blob)
    } catch {
      throw new Error('Backup file is not valid JSON')
    }

    const obj = parsed as Record<string, unknown>
    if (obj.application !== APP_NAME) {
      throw new Error('Not a valid Job Website Manager backup')
    }
    if (obj.version !== BACKUP_VERSION) {
      throw new Error('Unsupported backup version')
    }

    const vault = obj.vault as Record<string, unknown>
    if (
      !vault ||
      typeof vault !== 'object' ||
      typeof vault.id !== 'string' ||
      typeof vault.encryptedPayload !== 'string' ||
      !vault.metadata
    ) {
      throw new Error('Backup vault record is missing required fields')
    }

    const metadata = vault.metadata as Record<string, unknown>
    if (
      typeof metadata.version !== 'number' ||
      metadata.kdf !== 'PBKDF2' ||
      typeof metadata.iterations !== 'number' ||
      typeof metadata.salt !== 'string' ||
      typeof metadata.createdAt !== 'string' ||
      typeof metadata.updatedAt !== 'string'
    ) {
      throw new Error('Backup metadata contains invalid fields')
    }

    const result: BackupFile = {
      application: APP_NAME,
      version: obj.version as number,
      exportedAt: obj.exportedAt as string,
      vault: obj.vault as VaultRecord,
    }

    return result
  }

  static downloadBackup(record: VaultRecord): void {
    const content = this.exportBackup(record)
    const blob = new Blob([content], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `job-website-manager-backup-${timestamp}.json`

    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  static readBackupFile(file: File): Promise<BackupFile> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (event) => {
        try {
          const content = event.target?.result as string
          const backup = this.parseBackup(content)
          resolve(backup)
        } catch (error) {
          reject(error)
        }
      }
      reader.onerror = () => reject(new Error('Failed to read backup file'))
      reader.readAsText(file)
    })
  }
}

export const backupService = BackupService