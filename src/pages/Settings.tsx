import { useState } from 'react'
import { useVault } from '../VaultContext'
import type { Route } from '../App'
import { Modal } from '../components/Modal'

interface SettingsPageProps {
  onNavigate: (route: Route) => void
}

export default function SettingsPage({ onNavigate }: SettingsPageProps) {
  const {
    changeMasterPassword,
    lockVault,
    exportBackup,
    importBackup,
    error,
    clearError,
    addToast,
  } = useVault()

  const [localError, setLocalError] = useState<string | null>(null)

  const [changePasswordOpen, setChangePasswordOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [importPassword, setImportPassword] = useState('')
  const [importFile, setImportFile] = useState<File | null>(null)

  const handleSubmitPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()
    setLocalError(null)
    if (newPassword !== confirmNewPassword) {
      setLocalError('Passwords do not match')
      return
    }
    if (newPassword.length < 8) {
      setLocalError('New master password must be at least 8 characters')
      return
    }
    await changeMasterPassword(currentPassword, newPassword)
    setChangePasswordOpen(false)
    setCurrentPassword('')
    setNewPassword('')
    setConfirmNewPassword('')
  }

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!importFile) {
      return
    }
    if (!importPassword) {
      return
    }
    try {
      await importBackup(importFile, importPassword)
      setImportOpen(false)
      setImportFile(null)
      setImportPassword('')
    } catch (err) {
      console.error('Import failed:', err)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImportFile(file)
    }
  }

  const handleExport = () => {
    exportBackup()
    addToast('Backup file generated and downloaded', 'success')
  }

  const handleBack = () => {
    onNavigate({ name: 'dashboard' })
  }

  return (
    <div className="settings-page">
      <header className="page-header">
        <button
          type="button"
          className="btn btn-text"
          onClick={handleBack}
        >
          ← Back
        </button>
        <h1>Settings</h1>
      </header>

      {error && <div className="error-banner">{error}</div>}

      <div className="settings-sections">
        <section className="settings-section">
          <h2>Security</h2>
          <div className="settings-list">
            <button
              type="button"
              className="settings-item"
              onClick={() => setChangePasswordOpen(true)}
            >
              <span>Change Master Password</span>
            </button>
            <button
              type="button"
              className="settings-item"
              onClick={() => lockVault()}
            >
              <span>Lock Application</span>
            </button>
          </div>
        </section>

        <section className="settings-section">
          <h2>Data</h2>
          <div className="settings-list">
            <button
              type="button"
              className="settings-item"
              onClick={handleExport}
            >
              <span>Export Backup</span>
            </button>
            <button
              type="button"
              className="settings-item"
              onClick={() => {
                setImportOpen(true)
                setImportFile(null)
                setImportPassword('')
                const input = document.getElementById('import-file-input') as HTMLInputElement
                if (input) input.value = ''
              }}
            >
              <span>Import Backup</span>
            </button>
          </div>
        </section>

        <section className="settings-section">
          <h2>About</h2>
          <div className="settings-list">
            <div className="settings-item">
              <span>Job Website Manager</span>
              <span className="settings-value">v1.0.0</span>
            </div>
          </div>
          <p className="security-note">
            This application is designed as a personal local credential organizer.
            Keep regular encrypted backups and never share your master password.
          </p>
        </section>
      </div>

      <Modal
        open={changePasswordOpen}
        title="Change Master Password"
        onClose={() => setChangePasswordOpen(false)}
      >
        <form onSubmit={handleSubmitPassword} className="form">
          <div className="form-group">
            <label htmlFor="current-password">Current Master Password</label>
            <input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current master password"
              autoComplete="current-password"
            />
          </div>
          <div className="form-group">
            <label htmlFor="new-password">New Master Password</label>
            <input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New master password (min 8 characters)"
              autoComplete="new-password"
            />
          </div>
          <div className="form-group">
            <label htmlFor="confirm-new-password">Confirm New Master Password</label>
            <input
              id="confirm-new-password"
              type="password"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              placeholder="Confirm new master password"
              autoComplete="new-password"
            />
          </div>
          {(error || localError) && <div className="form-error">{error || localError}</div>}
          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setChangePasswordOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={
                !currentPassword ||
                newPassword !== confirmNewPassword ||
                newPassword.length < 8
              }
            >
              Save
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={importOpen}
        title="Import Backup"
        onClose={() => setImportOpen(false)}
      >
        <form onSubmit={handleImport} className="form">
          <div className="form-group">
            <label htmlFor="import-file">Backup File</label>
            <input
              id="import-file"
              type="file"
              accept=".json,application/json"
              onChange={handleFileChange}
            />
          </div>
          <div className="form-group">
            <label htmlFor="import-password">Master Password for Backup</label>
            <input
              id="import-password"
              type="password"
              value={importPassword}
              onChange={(e) => setImportPassword(e.target.value)}
              placeholder="Master password used when exporting"
              autoComplete="current-password"
            />
          </div>
          {error && <div className="form-error">{error}</div>}
          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setImportOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-danger"
              disabled={!importFile || !importPassword}
            >
              Restore
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
