import { type Category } from '../types'
import { ConfirmDialog } from './ConfirmDialog'
import { useState } from 'react'

interface CategoryCardProps {
  category: Category
  websiteCount: number
  favoriteCount: number
  onOpen: () => void
  onEdit: () => void
  onDelete: () => void
}

export function CategoryCard({
  category,
  websiteCount,
  favoriteCount,
  onOpen,
  onEdit,
  onDelete,
}: CategoryCardProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)

  const handleDelete = () => {
    setConfirmOpen(false)
    onDelete()
  }

  return (
    <>
      <div className="category-card">
        <div className="category-card-header">
          <div className="category-icon" aria-hidden="true">
            📁
          </div>
          <div className="category-info">
            <h3 className="category-name">{category.name}</h3>
            <p className="category-count">
              {websiteCount === 1 ? '1 website' : `${websiteCount} websites`}
              {favoriteCount > 0 && ` • ${favoriteCount} favorite`}
            </p>
          </div>
          <div className="category-actions">
            <button
              type="button"
              className="btn btn-icon"
              onClick={onOpen}
              aria-label={`Open ${category.name}`}
            >
              📂
            </button>
            <button
              type="button"
              className="btn btn-icon"
              onClick={onEdit}
              aria-label={`Edit ${category.name}`}
            >
              ✏
            </button>
            <button
              type="button"
              className="btn btn-icon btn-danger"
              onClick={() => setConfirmOpen(true)}
              aria-label={`Delete ${category.name}`}
            >
              🗑
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title={`Delete "${category.name}"?`}
        message="This will also remove all websites inside this category."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        destructive
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleDelete}
      />
    </>
  )
}
