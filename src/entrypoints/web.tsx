import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserStorageAdapter } from '../adapters/browser-storage-adapter'
import { SpecEditorApp } from '../adapters/spec-editor-app'
import 'react-data-grid/lib/styles.css'
import '../index.css'

export function mountWebApp(target: HTMLElement): void {
  const storageAdapter = new BrowserStorageAdapter(window.localStorage)
  createRoot(target).render(
    <StrictMode>
      <SpecEditorApp storageAdapter={storageAdapter} />
    </StrictMode>,
  )
}

