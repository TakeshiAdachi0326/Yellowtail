import type { BrowserStoragePort, StorageAdapter } from '../core/storage/storage-adapter'

export class BrowserStorageAdapter implements StorageAdapter {
  readonly environment = 'browser' as const
  private readonly storage: BrowserStoragePort

  constructor(storage: BrowserStoragePort) {
    this.storage = storage
  }

  async readText(path: string): Promise<string> {
    return this.storage.getItem(path) ?? ''
  }

  async writeText(path: string, content: string): Promise<void> {
    this.storage.setItem(path, content)
  }
}
