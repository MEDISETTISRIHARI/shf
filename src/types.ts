export interface Website {
  id: string
  categoryId: string
  name: string
  url: string
  loginId: string
  password: string
  description: string
  favorite: boolean
  createdAt: string
  updatedAt: string
}

export interface Category {
  id: string
  name: string
  order: number
  createdAt: string
  updatedAt: string
}

export interface ToastMessage {
  id: string
  message: string
  type: 'info' | 'success' | 'error'
}

export interface ConfirmDialogState {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
}

export interface ModalState {
  open: boolean
  title: string
}

export type SortMode = 'favorites-first' | 'alphabetical' | 'created'