import { useState, useEffect } from 'react'
import { useVault } from '../VaultContext'
import type { Route } from '../App'
import type { Website } from '../types'
import { WebsiteCard } from '../components/WebsiteCard'
import { WebsiteForm } from '../components/WebsiteForm'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { SearchBar } from '../components/SearchBar'

interface CategoryPageProps {
  categoryId: string
  onNavigate: (route: Route) => void
}

export default function CategoryPage({ categoryId, onNavigate }: CategoryPageProps) {
  const {
    categories,
    websites,
    error,
    clearError,
    addWebsite,
    updateWebsite,
    deleteWebsite,
    toggleFavorite,
  } = useVault()

  const [addFormOpen, setAddFormOpen] = useState(false)
  const [editFormOpen, setEditFormOpen] = useState(false)
  const [editingWebsite, setEditingWebsite] = useState<Website | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deletingWebsite, setDeletingWebsite] = useState<Website | null>(null)

  const category = categories.find((c) => c.id === categoryId)
  const categoryWebsites = websites
    .filter((w) => w.categoryId === categoryId)
    .sort((a, b) => {
      if (a.favorite !== b.favorite) return b.favorite ? -1 : 1
      return a.name.localeCompare(b.name)
    })

  const [searchQuery, setSearchQuery] = useState('')
  const filteredWebsites = categoryWebsites.filter((w) => {
    const q = searchQuery.toLowerCase()
    return (
      !q ||
      w.name.toLowerCase().includes(q) ||
      w.loginId.toLowerCase().includes(q) ||
      w.description.toLowerCase().includes(q)
    )
  })

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => clearError(), 5000)
      return () => clearTimeout(timer)
    }
  }, [error, clearError])

  const handleAddWebsite = (data: Omit<Website, 'id' | 'categoryId' | 'createdAt' | 'updatedAt'>) => {
    void addWebsite(categoryId, data)
    setAddFormOpen(false)
  }

  const handleEditWebsite = (website: Website) => {
    setEditingWebsite(website)
    setEditFormOpen(true)
  }

  const handleUpdateWebsite = (data: Omit<Website, 'id' | 'categoryId' | 'createdAt' | 'updatedAt'>) => {
    if (editingWebsite) {
      void updateWebsite(editingWebsite.id, data)
      setEditFormOpen(false)
      setEditingWebsite(null)
    }
  }

  const handleDeleteClick = (website: Website) => {
    setDeletingWebsite(website)
    setDeleteConfirmOpen(true)
  }

  const handleDeleteConfirm = () => {
    if (deletingWebsite) {
      void deleteWebsite(deletingWebsite.id)
      setDeleteConfirmOpen(false)
      setDeletingWebsite(null)
    }
  }

const getInitialFormData = (website: Website | null | undefined): Partial<Website> => {
  if (!website) return {};
  return {
    name: website.name,
    url: website.url,
    loginId: website.loginId,
    password: website.password,
    description: website.description,
    favorite: website.favorite,
  };
}

  if (!category) {
    return (
      <div className="category-page">
        <header className="page-header">
          <button
            type="button"
            className="btn btn-text"
            onClick={() => onNavigate({ name: 'dashboard' })}
          >
            ← Back
          </button>
        </header>
        <div className="empty-state">
          <p>Category not found.</p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => onNavigate({ name: 'dashboard' })}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="category-page">
      <header className="page-header">
        <button
          type="button"
          className="btn btn-text"
          onClick={() => onNavigate({ name: 'dashboard' })}
        >
          ← Back
        </button>
        <h1>{category.name}</h1>
        <div className="category-page-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setAddFormOpen(true)}
          >
            + Add Website
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => onNavigate({ name: 'settings' })}
          >
            ⚙ Settings
          </button>
        </div>
      </header>

      <div className="category-search">
        <SearchBar
          placeholder="Search websites..."
          scope="category"
          categoryId={categoryId}
          value={searchQuery}
          onChange={setSearchQuery}
        />
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="website-list">
        {categoryWebsites.length === 0 ? (
          <div className="empty-state">
            <p>No websites in this category yet.</p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setAddFormOpen(true)}
            >
              + Add Website
            </button>
          </div>
        ) : filteredWebsites.length === 0 ? (
          <div className="empty-state">
            <p>No matching websites found.</p>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setSearchQuery('')}
            >
              Clear search
            </button>
          </div>
        ) : (
          filteredWebsites.map((website) => (
            <WebsiteCard
              key={website.id}
              website={website}
              onOpen={() => window.open(website.url, '_blank', 'noopener,noreferrer')}
              onEdit={() => handleEditWebsite(website)}
              onDelete={() => handleDeleteClick(website)}
              onToggleFavorite={() => void toggleFavorite(website.id)}
            />
          ))
        )}
      </div>

      <WebsiteForm
        open={addFormOpen}
        title="Add Website"
        onClose={() => setAddFormOpen(false)}
        onSubmit={handleAddWebsite}
      />

      <WebsiteForm
        open={editFormOpen}
        title="Edit Website"
        initialData={getInitialFormData(editingWebsite)}
        onClose={() => {
          setEditFormOpen(false)
          setEditingWebsite(null)
        }}
        onSubmit={handleUpdateWebsite}
      />

      <ConfirmDialog
        open={deleteConfirmOpen}
        title={`Delete "${deletingWebsite?.name}"?`}
        message="This website entry will be permanently removed."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        destructive
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  )
}
