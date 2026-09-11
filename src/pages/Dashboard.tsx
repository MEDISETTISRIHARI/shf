import { useState, useEffect } from 'react'
import { useVault } from '../VaultContext'
import type { Route } from '../App'
import type { Category } from '../types'
import { CategoryCard } from '../components/CategoryCard'
import { CategoryForm } from '../components/CategoryForm'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { SearchBar } from '../components/SearchBar'

interface DashboardProps {
  onNavigate: (route: Route) => void
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const {
    categories,
    websites,
    error,
    clearError,
    createCategory,
    updateCategory,
    deleteCategory,
    lockVault,
  } = useVault()

  const [categoryFormOpen, setCategoryFormOpen] = useState(false)
  const [editCategoryOpen, setEditCategoryOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null)
  const [showFavorites, setShowFavorites] = useState(false)

  const handleCreateCategory = (name: string) => {
    void createCategory(name)
    setCategoryFormOpen(false)
  }

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category)
    setEditCategoryOpen(true)
  }

  const handleUpdateCategory = (name: string) => {
    if (editingCategory) {
      void updateCategory(editingCategory.id, name)
      setEditCategoryOpen(false)
    }
  }

  const handleDeleteClick = (category: Category) => {
    setDeletingCategory(category)
    setDeleteConfirmOpen(true)
  }

  const handleDeleteConfirm = () => {
    if (deletingCategory) {
      void deleteCategory(deletingCategory.id)
      setDeleteConfirmOpen(false)
      setDeletingCategory(null)
    }
  }

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => clearError(), 5000)
      return () => clearTimeout(timer)
    }
  }, [error, clearError])

  const favoritesCount = websites.filter((w) => w.favorite).length

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Job Website Manager</h1>
        <div className="header-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => onNavigate({ name: 'settings' })}
            aria-label="Settings"
          >
            ⚙ Settings
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => lockVault()}
            aria-label="Lock application"
          >
            🔒 Lock
          </button>
        </div>
      </header>

      <div className="dashboard-search">
        <SearchBar
          placeholder="Search websites or categories..."
          scope="global"
          onNavigateToCategory={(id) => onNavigate({ name: 'category', id })}
        />
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="dashboard-content">
        <div className="dashboard-section">
          <div className="section-header">
            <h2>Categories</h2>
            <div>
              <button
                type="button"
                className={`btn btn-sm ${showFavorites ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setShowFavorites(!showFavorites)}
              >
                {showFavorites ? '⭐ Showing Favorites' : '⭐ Favorites'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setCategoryFormOpen(true)}
              >
                + Create Category
              </button>
            </div>
          </div>

          {categories.length === 0 ? (
            <div className="empty-state">
              <p>No categories yet.</p>
              <p>Create your first category to get started.</p>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setCategoryFormOpen(true)}
              >
                + Create Category
              </button>
            </div>
          ) : (
            <div className="category-grid">
              {categories
                .filter((category) => {
                  if (!showFavorites) return true
                  return websites.some((w) => w.categoryId === category.id && w.favorite)
                })
                .map((category) => {
                  const categoryWebsites = websites.filter((w) => w.categoryId === category.id)
                  const websiteCount = categoryWebsites.length
                  const favCount = categoryWebsites.filter((w) => w.favorite).length
                  return (
                    <CategoryCard
                      key={category.id}
                      category={category}
                      websiteCount={websiteCount}
                      favoriteCount={favCount}
                      onOpen={() => onNavigate({ name: 'category', id: category.id })}
                      onEdit={() => handleEditCategory(category)}
                      onDelete={() => handleDeleteClick(category)}
                    />
                  )
                })}
            </div>
          )}
        </div>

        {favoritesCount > 0 && (
          <div className="dashboard-section">
            <h2>Favorites</h2>
            <div className="favorites-list">
              {websites
                .filter((w) => w.favorite)
                .slice(0, 10)
                .map((website) => {
                  const category = categories.find((c) => c.id === website.categoryId)
                  return (
                    <div key={website.id} className="favorite-item">
                      <span className="favorite-name">{website.name}</span>
                      {category && (
                        <span className="favorite-category">in {category.name}</span>
                      )}
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() =>
                          onNavigate({ name: 'category', id: website.categoryId })
                        }
                      >
                        Open
                      </button>
                    </div>
                  )
                })}
            </div>
          </div>
        )}
      </div>

      <CategoryForm
        open={categoryFormOpen}
        title="Create Category"
        onClose={() => setCategoryFormOpen(false)}
        onSubmit={handleCreateCategory}
      />

      <CategoryForm
        open={editCategoryOpen}
        title="Edit Category"
        initialValue={editingCategory?.name ?? ''}
        onClose={() => setEditCategoryOpen(false)}
        onSubmit={handleUpdateCategory}
      />

      <ConfirmDialog
        open={deleteConfirmOpen}
        title={`Delete "${deletingCategory?.name}"?`}
        message="This will also remove all websites inside this category."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        destructive
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  )
}
