import { useState, useRef, useEffect } from 'react'
import { useVault } from '../VaultContext'

export function UnlockScreen() {
  const { vaultExists, initializeVault, unlockVault, error, clearError } = useVault()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return
    clearError()
    setLocalError(null)

    if (password.length < 1) {
      setLocalError('Password is required')
      return
    }

    if (!vaultExists) {
      if (password !== confirmPassword) {
        setLocalError('Passwords do not match')
        return
      }
      if (password.length < 8) {
        setLocalError('Master password must be at least 8 characters')
        return
      }
      setIsSubmitting(true)
      await initializeVault(password)
      setIsSubmitting(false)
      if (!error) {
        setPassword('')
        setConfirmPassword('')
      }
    } else {
      setIsSubmitting(true)
      await unlockVault(password)
      setIsSubmitting(false)
      if (!error) {
        setPassword('')
      }
    }
  }

  const displayError = error || localError

  return (
    <div className="unlock-screen">
      <div className="unlock-card">
        <h1>Job Website Manager</h1>
        {vaultExists ? (
          <>
            <h2>Unlock Job Website Manager</h2>
            <form onSubmit={handleSubmit} className="form">
              <div className="form-group">
                <label htmlFor="master-password">Master Password</label>
                <input
                  ref={inputRef}
                  id="master-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your master password"
                  autoComplete="current-password"
                  disabled={isSubmitting}
                />
              </div>
              {displayError && <div className="form-error">{displayError}</div>}
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting || !password}
              >
                {isSubmitting ? 'Unlocking...' : 'Unlock'}
              </button>
            </form>
          </>
        ) : (
          <>
            <h2>Create Master Password</h2>
            <p className="unlock-description">
              Create your secure local vault. Your master password will encrypt all stored
              credentials.
            </p>
            <form onSubmit={handleSubmit} className="form">
              <div className="form-group">
                <label htmlFor="create-password">Master Password</label>
                <input
                  ref={inputRef}
                  id="create-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a master password (min 8 characters)"
                  autoComplete="new-password"
                  disabled={isSubmitting}
                />
              </div>
              <div className="form-group">
                <label htmlFor="confirm-password">Confirm Master Password</label>
                <input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm master password"
                  autoComplete="new-password"
                  disabled={isSubmitting}
                />
              </div>
              {displayError && <div className="form-error">{displayError}</div>}
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting || !password || password !== confirmPassword}
              >
                {isSubmitting ? 'Creating vault...' : 'Create Vault'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
