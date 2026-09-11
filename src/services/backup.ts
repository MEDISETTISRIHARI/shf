import type { VaultRecord } from './database'

interface BackupFile {
  application: string
  version: number
  exportedAt: string
  vault: VaultRecord
}

class BackupService {
  downloadBackup(record: VaultRecord): void {
    const backup: BackupFile = {
      application: 'SHF',
      version: 1,
      exportedAt: new Date().toISOString(),
      vault: record,
    }

    const blob = new Blob(
      [JSON.stringify(backup, null, 2)],
      { type: 'application/json' },
    )

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = `shf-backup-${new Date()
      .toISOString()
      .slice(0, 10)}.json`

    document.body.appendChild(link)
    link.click()
    link.remove()

    URL.revokeObjectURL(url)
  }

  async readBackupFile(file: File): Promise<BackupFile> {
    const text = await file.text()

    let parsed: unknown

    try {
      parsed = JSON.parse(text)
    } catch {
      throw new Error('Invalid backup file. The file is not valid JSON.')
    }

    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Invalid backup file.')
    }

    const data = parsed as Record<string, unknown>

    if (data.application !== 'SHF') {
      throw new Error('This is not a valid SHF backup file.')
    }

    if (!data.vault || typeof data.vault !== 'object') {
      throw new Error('Backup file does not contain a vault.')
    }

    const vault = data.vault as Record<string, unknown>

    if (
      typeof vault.encryptedPayload !== 'string' ||
      !vault.metadata
    ) {
      throw new Error('Backup file is incomplete or corrupted.')
    }

    return {
      application: 'SHF',
      version:
        typeof data.version === 'number'
          ? data.version
          : 1,
      exportedAt:
        typeof data.exportedAt === 'string'
          ? data.exportedAt
          : new Date().toISOString(),
      vault: data.vault as VaultRecord,
    }
  }
}

export const backupService = new BackupService()