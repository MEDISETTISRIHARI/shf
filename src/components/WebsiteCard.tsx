import { useState } from 'react'
import { type Website } from '../types'

interface WebsiteCardProps {
  website: Website
  onOpen: () => void
  onEdit: () => void
  onDelete: () => void
  onToggleFavorite: () => void
}

export function WebsiteCard({
  website,
  onOpen,
  onEdit,
  onDelete,
  onToggleFavorite,
}: WebsiteCardProps) {
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [passwordCopyStatus, setPasswordCopyStatus] = useState<'idle' | 'copied'>('idle')
  const [idCopyStatus, setIdCopyStatus] = useState<'idle' | 'copied'>('idle')

  const handleCopyPassword = async () => {
    try {
      await navigator.clipboard.writeText(website.password)
      setPasswordCopyStatus('copied')
      setTimeout(() => setPasswordCopyStatus('idle'), 2000)
      clearClipboardAfterDelay()
    } catch (err) {
      console.error('Password copy failed:', err)
    }
  }

  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(website.loginId)
      setIdCopyStatus('copied')
      setTimeout(() => setIdCopyStatus('idle'), 2000)
      clearClipboardAfterDelay()
    } catch (err) {
      console.error('ID copy failed:', err)
    }
  }

  const clearClipboardAfterDelay = () => {
    setTimeout(() => {
      navigator.clipboard.writeText('').catch(() => {})
    }, 30000)
  }

  return (
    <div className="website-card">
      <div className="website-card-header">
        <div className="website-name-row">
          <h3 className="website-name">{website.name}</h3>
          <button
            type="button"
            className={`btn btn-sm btn-icon favorite-toggle ${website.favorite ? 'active' : ''}`}
            onClick={onToggleFavorite}
            aria-label={website.favorite ? 'Remove from favorites' : 'Mark as favorite'}
            aria-pressed={website.favorite}
          >
            {website.favorite ? '⭐' : '☆'}
          </button>
        </div>
        {website.url && (
          <p className="website-url">
            <a href={website.url} target="_blank" rel="noopener noreferrer" onClick={onOpen}>
              {website.url}
            </a>
          </p>
        )}
      </div>

      {website.description && (
        <p className="website-description">{website.description}</p>
      )}

      <div className="credentials-section">
        <div className="credential-row">
          <label>Login ID</label>
          <div className="credential-value">
            {website.loginId || <span className="empty">—</span>}
          </div>
        </div>
        <div className="credential-row">
          <label>Password</label>
          <div className="credential-value">
            {website.password && passwordVisible ? website.password : '•'.repeat(website.password?.length ?? 8)}
          </div>
        </div>
      </div>

      <div className="website-buttons">
        <div className="website-action-row">
          <button type="button" className="btn btn-primary" onClick={onOpen}>
            🌐 Open Website
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleCopyId}
            disabled={!website.loginId}
            aria-label={idCopyStatus === 'copied' ? 'ID copied' : 'Copy login ID'}
          >
            {idCopyStatus === 'copied' ? '✓ ID copied' : '📋 Copy ID'}
          </button>
        </div>
        <div className="website-action-row">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleCopyPassword}
            disabled={!website.password}
            aria-label={passwordCopyStatus === 'copied' ? 'Password copied' : 'Copy password'}
          >
            {passwordCopyStatus === 'copied' ? '✓ Password copied' : '📋 Copy Password'}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setPasswordVisible((v) => !v)}
            disabled={!website.password}
            aria-label={passwordVisible ? 'Hide password' : 'Show password'}
            aria-pressed={passwordVisible}
          >
            {passwordVisible ? '🙈 Hide' : '👁 Show'}
          </button>
        </div>
      </div>

      <div className="website-edit-actions">
        <button type="button" className="btn btn-secondary" onClick={onEdit}>
          Edit
        </button>
        <button type="button" className="btn btn-danger" onClick={onDelete}>
          Delete
        </button>
      </div>
    </div>
  )
}
