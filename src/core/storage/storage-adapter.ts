export type StorageEnvironment = 'browser' | 'tauri' | 'vscode'

export interface StorageAdapter {
  readonly environment: StorageEnvironment
  readText(path: string): Promise<string>
  writeText(path: string, content: string): Promise<void>
}

export interface BrowserStoragePort {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export interface TauriFsPort {
  readTextFile(path: string): Promise<string>
  writeTextFile(path: string, content: string): Promise<void>
}

export interface VSCodeFsPort {
  readFile(uri: string): Promise<Uint8Array>
  writeFile(uri: string, content: Uint8Array): Promise<void>
}

export type StorageAdapterPorts = {
  browser?: BrowserStoragePort
  tauri?: TauriFsPort
  vscode?: VSCodeFsPort
}

export type StorageAdapterFactory = (
  environment: StorageEnvironment,
  ports: StorageAdapterPorts,
) => StorageAdapter
