import { useEffect, useState } from 'react'
import { useVault } from '../VaultContext'
import { type Website, type Category } from '../types'

interface SearchResult {
  type: 'website' | 'category'
  website?: Website
  category?: Category
}

interface SearchBarProps {
  placeholder?: string
  scope?: 'global' | 'category'
  categoryId?: string
  value?: string
  onChange?: (value: string) => void
  onNavigateToCategory?: (categoryId: string) => void
}

export function SearchBar({
  placeholder = 'Search...',
  scope = 'global',
  categoryId,
  value: controlledValue,
  onChange,
  onNavigateToCategory,
}: SearchBarProps) {
  const { categories, websites } = useVault()
  const [internalValue, setInternalValue] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [showResults, setShowResults] = useState(false)

  const value = controlledValue ?? internalValue
  const setValue = onChange ?? setInternalValue

  useEffect(() => {
    if (!value.trim()) {
      setResults([])
      return
    }

    const q = value.toLowerCase()
    const matches: SearchResult[] = []

    if (scope === 'global') {
      for (const website of websites) {
        if (
          website.name.toLowerCase().includes(q) ||
          website.loginId.toLowerCase().includes(q) ||
          website.description.toLowerCase().includes(q)
        ) {
          const category = categories.find((c) => c.id === website.categoryId)
          matches.push({ type: 'website', website, category })
        }
      }
      for (const category of categories) {
        if (category.name.toLowerCase().includes(q)) {
          if (!matches.some((m) => m.type === 'category' && m.category?.id === category.id)) {
            matches.push({ type: 'category', category })
          }
        }
      }
    } else {
      const categoryWebsites = categoryId
        ? websites.filter((w) => w.categoryId === categoryId)
        : []
      for (const website of categoryWebsites) {
        if (
          website.name.toLowerCase().includes(q) ||
          website.loginId.toLowerCase().includes(q) ||
          website.description.toLowerCase().includes(q)
        ) {
          matches.push({ type: 'website', website })
        }
      }
    }

    setResults(matches)
  }, [value, scope, categoryId, websites, categories])

  const handleResultClick = (result: SearchResult) => {
    if (result.type === 'website' && result.category) {
      onNavigateToCategory?.(result.category.id)
    } else if (result.type === 'category') {
      onNavigateToCategory?.(result.category!.id)
    }
    setValue('')
    setShowResults(false)
  }

  return (
    <div className="search-container">
      <div className="search-wrapper">
        <input
          type="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setShowResults(true)}
          onBlur={() => setTimeout(() => setShowResults(false), 150)}
          placeholder={placeholder}
          aria-label={placeholder}
          className="search-input"
        />
        <span className="search-icon" aria-hidden="true">
          🔍
        </span>
      </div>
      {showResults && value.trim() && results.length > 0 && (
        <ul className="search-results" role="listbox">
          {results.map((result, index) => (
            <li
              key={`${result.type}-${result.website?.id ?? result.category?.id}-${index}`}
              className="search-result-item"
              onClick={() => handleResultClick(result)}
              role="option"
              onMouseDown={(e) => e.preventDefault()}
            >
              {result.type === 'website' && result.website ? (
                <div className="search-result-website">
                  <span className="search-result-name">{result.website.name}</span>
                  {result.category && (
                    <span className="search-result-category">in {result.category.name}</span>
                  )}
                </div>
              ) : (
                <span className="search-result-category-name">{result.category?.name}</span>
              )}
              <span className="search-result-type">{result.type === 'website' ? 'Website' : 'Category'}</span>
            </li>
          ))}
        </ul>
      )}
      {showResults && value.trim() && results.length === 0 && (
        <div className="search-no-results">No matching results found</div>
      )}
    </div>
  )
}
