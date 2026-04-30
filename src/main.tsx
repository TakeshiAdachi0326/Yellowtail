import { mountWebApp } from './entrypoints/web'

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Root element "#root" was not found.')
}

mountWebApp(rootElement)
