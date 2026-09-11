import { useState, useEffect } from 'react'
import { useVault } from '../VaultContext'

export function UnlockScreen() {
  const {
    authenticated,
    vaultExists,
    loading,
    error,
    clearError,
    userEmail,
    signIn,
    signUp,
    signOut,
    initializeVault,
    unlockVault,
  } = useVault()

  const [accountMode, setAccountMode] =
    useState<'signin' | 'signup'>('signin')

  const [email, setEmail] = useState('')
  const [accountPassword, setAccountPassword] = useState('')
  const [confirmAccountPassword, setConfirmAccountPassword] = useState('')

  const [masterPassword, setMasterPassword] = useState('')
  const [confirmMasterPassword, setConfirmMasterPassword] = useState('')

  useEffect(() => {
    clearError()
  }, [accountMode, authenticated, clearError])

  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()

    if (!email.trim()) return

    if (accountMode === 'signup') {
      if (accountPassword.length < 8) return

      if (accountPassword !== confirmAccountPassword) {
        return
      }

      await signUp(email.trim(), accountPassword)
    } else {
      await signIn(email.trim(), accountPassword)
    }
  }

  const handleVaultSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()

    if (!vaultExists) {
      if (masterPassword.length < 8) return

      if (masterPassword !== confirmMasterPassword) {
        return
      }

      await initializeVault(masterPassword)
    } else {
      await unlockVault(masterPassword)
    }
  }

  if (loading && !authenticated) {
    return (
      <main className="unlock-screen">
        <div className="unlock-card">
          <h1>SHF</h1>
          <p className="unlock-subtitle">Job Website Manager</p>
          <p>Connecting securely...</p>
        </div>
      </main>
    )
  }

  if (!authenticated) {
    return (
      <main className="unlock-screen">
        <div className="unlock-card">
          <h1>SHF</h1>

          <p className="unlock-subtitle">
            Job Website Manager
          </p>

          <h2>
            {accountMode === 'signin'
              ? 'Sign in'
              : 'Create account'}
          </h2>

          <p className="security-note">
            Your SHF account syncs your encrypted vault
            across your devices.
          </p>

          <form
            onSubmit={handleAccountSubmit}
            className="form"
          >
            <div className="form-group">
              <label htmlFor="account-email">
                Email
              </label>

              <input
                id="account-email"
                type="email"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="account-password">
                Account Password
              </label>

              <input
                id="account-password"
                type="password"
                value={accountPassword}
                onChange={(e) =>
                  setAccountPassword(e.target.value)
                }
                placeholder="At least 8 characters"
                autoComplete={
                  accountMode === 'signin'
                    ? 'current-password'
                    : 'new-password'
                }
                required
              />
            </div>

            {accountMode === 'signup' && (
              <div className="form-group">
                <label htmlFor="confirm-account-password">
                  Confirm Account Password
                </label>

                <input
                  id="confirm-account-password"
                  type="password"
                  value={confirmAccountPassword}
                  onChange={(e) =>
                    setConfirmAccountPassword(
                      e.target.value,
                    )
                  }
                  placeholder="Repeat account password"
                  autoComplete="new-password"
                  required
                />
              </div>
            )}

            {error && (
              <div className="form-error">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={
                loading ||
                !email.trim() ||
                accountPassword.length < 8 ||
                (accountMode === 'signup' &&
                  accountPassword !==
                    confirmAccountPassword)
              }
            >
              {loading
                ? 'Please wait...'
                : accountMode === 'signin'
                  ? 'Sign in'
                  : 'Create account'}
            </button>
          </form>

          <button
            type="button"
            className="btn btn-text"
            onClick={() =>
              setAccountMode((mode) =>
                mode === 'signin'
                  ? 'signup'
                  : 'signin',
              )
            }
          >
            {accountMode === 'signin'
              ? 'Create a new SHF account'
              : 'Already have an account? Sign in'}
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="unlock-screen">
      <div className="unlock-card">
        <h1>SHF</h1>

        <p className="unlock-subtitle">
          Job Website Manager
        </p>

        <div className="security-note">
          Signed in as <strong>{userEmail}</strong>
        </div>

        <h2>
          {vaultExists
            ? 'Unlock your vault'
            : 'Create your vault'}
        </h2>

        <p className="security-note">
          {vaultExists
            ? 'Enter your SHF master password to decrypt your encrypted cloud vault.'
            : 'Create a master password. It encrypts your job-site credentials and is never sent to Supabase.'}
        </p>

        <form
          onSubmit={handleVaultSubmit}
          className="form"
        >
          <div className="form-group">
            <label htmlFor="master-password">
              Master Password
            </label>

            <input
              id="master-password"
              type="password"
              value={masterPassword}
              onChange={(e) =>
                setMasterPassword(e.target.value)
              }
              placeholder="At least 8 characters"
              autoComplete="current-password"
              required
              autoFocus
            />
          </div>

          {!vaultExists && (
            <div className="form-group">
              <label htmlFor="confirm-master-password">
                Confirm Master Password
              </label>

              <input
                id="confirm-master-password"
                type="password"
                value={confirmMasterPassword}
                onChange={(e) =>
                  setConfirmMasterPassword(
                    e.target.value,
                  )
                }
                placeholder="Repeat master password"
                autoComplete="new-password"
                required
              />
            </div>
          )}

          {error && (
            <div className="form-error">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={
              loading ||
              masterPassword.length < 8 ||
              (!vaultExists &&
                masterPassword !==
                  confirmMasterPassword)
            }
          >
            {loading
              ? 'Please wait...'
              : vaultExists
                ? 'Unlock Vault'
                : 'Create Vault'}
          </button>
        </form>

        <button
          type="button"
          className="btn btn-text"
          onClick={() => void signOut()}
          disabled={loading}
        >
          Sign out
        </button>
      </div>
    </main>
  )
}