import { useState, useEffect, useRef } from 'react'
import { Modal } from './Modal'

interface CategoryFormProps {
  open: boolean
  title: string
  initialValue?: string
  onClose: () => void
  onSubmit: (name: string) => void
}

export function CategoryForm({ open, title, initialValue = '', onClose, onSubmit }: CategoryFormProps) {
  const [name, setName] = useState(initialValue)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setName(initialValue)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open, initialValue])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    onSubmit(trimmed)
    onClose()
  }

  return (
    <Modal open={open} title={title} onClose={onClose}>
      <form onSubmit={handleSubmit} className="form">
        <div className="form-group">
          <label htmlFor="category-name">Category Name</label>
          <input
            ref={inputRef}
            id="category-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Government Jobs"
            autoComplete="off"
          />
        </div>
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            Save
          </button>
        </div>
      </form>
    </Modal>
  )
}
