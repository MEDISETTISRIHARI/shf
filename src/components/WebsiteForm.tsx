import { useState, useEffect, useRef } from 'react'
import { type Website } from '../types'
import { EncryptionService } from '../services/encryption'
import { Modal } from './Modal'

interface WebsiteFormProps {
  open: boolean
  title: string
  initialData?: Partial<Website>
  onClose: () => void
  onSubmit: (data: Omit<Website, 'id' | 'categoryId' | 'createdAt' | 'updatedAt'>) => void
}

export function WebsiteForm({ open, title, initialData, onClose, onSubmit }: WebsiteFormProps) {
  const [formData, setFormData] = useState<Omit<Website, 'id' | 'categoryId' | 'createdAt' | 'updatedAt'>>(
    { name: '', url: '', loginId: '', password: '', description: '', favorite: false }
  )
  const [passwordVisible, setPasswordVisible] = useState(false)
  const firstInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setFormData({
        name: initialData?.name ?? '',
        url: initialData?.url ?? '',
        loginId: initialData?.loginId ?? '',
        password: initialData?.password ?? '',
        description: initialData?.description ?? '',
        favorite: initialData?.favorite ?? false,
      })
      setPasswordVisible(false)
      setTimeout(() => firstInputRef.current?.focus(), 50)
    }
  }, [open, initialData])

  const handleChange = (field: keyof typeof formData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [field]: e.target.value })
  }

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, favorite: e.target.checked })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = {
      name: formData.name.trim(),
      url: formData.url.trim(),
      loginId: formData.loginId.trim(),
      password: formData.password,
      description: (formData.description ?? '').trim(),
      favorite: formData.favorite,
    }
    if (!trimmed.name) return
    if (!trimmed.url) return
    if (!EncryptionService.isValidUrl(trimmed.url)) return
    onSubmit(trimmed)
    onClose()
  }

  return (
    <Modal open={open} title={title} onClose={onClose}>
      <form onSubmit={handleSubmit} className="form">
        <div className="form-group">
          <label htmlFor="website-name">Website Name</label>
          <input
            ref={firstInputRef}
            id="website-name"
            type="text"
            value={formData.name}
            onChange={handleChange('name')}
            placeholder="e.g. SSC"
            autoComplete="off"
          />
        </div>
        <div className="form-group">
          <label htmlFor="website-url">Official Website Link</label>
          <input
            id="website-url"
            type="url"
            value={formData.url}
            onChange={handleChange('url')}
            placeholder="https://ssc.gov.in"
            autoComplete="off"
          />
        </div>
        <div className="form-group">
          <label htmlFor="website-login">Login ID</label>
          <input
            id="website-login"
            type="text"
            value={formData.loginId}
            onChange={handleChange('loginId')}
            placeholder="Email, username, or registration ID"
            autoComplete="off"
          />
        </div>
        <div className="form-group">
          <label htmlFor="website-password">Password</label>
          <div className="password-input-wrapper">
            <input
              id="website-password"
              type={passwordVisible ? 'text' : 'password'}
              value={formData.password}
              onChange={handleChange('password')}
              placeholder=""
              autoComplete="new-password"
            />
            <button
              type="button"
              className="btn btn-icon"
              onClick={() => setPasswordVisible((v) => !v)}
              aria-label={passwordVisible ? 'Hide password' : 'Show password'}
              aria-pressed={passwordVisible}
            >
              {passwordVisible ? '🙈' : '👁'}
            </button>
          </div>
        </div>
        <div className="form-group">
          <label htmlFor="website-description">Description</label>
          <textarea
            id="website-description"
            value={formData.description}
            onChange={handleChange('description')}
            placeholder="Brief description of this website..."
            rows={5}
            maxLength={500}
          />
        </div>
        <div className="form-row">
          <input
            id="website-favorite"
            type="checkbox"
            checked={formData.favorite}
            onChange={handleCheckboxChange}
          />
          <label htmlFor="website-favorite">☆ Favorite</label>
        </div>
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            Save Website
          </button>
        </div>
      </form>
    </Modal>
  )
}
