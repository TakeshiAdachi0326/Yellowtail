import type { StorageAdapter, TauriFsPort } from '../core/storage/storage-adapter'

/**
 * Tauri拡張/Node側で `tauri-fs` を port として注入して使う想定。
 *
 * - `path` は Tauri が扱うパス（string）をそのまま受け渡し
 * - このファイル自体は `@tauri-apps/api/fs` 等を import しない
 */
export class TauriStorageAdapter implements StorageAdapter {
  readonly environment = 'tauri' as const

  private readonly fs: TauriFsPort

  constructor(fs: TauriFsPort) {
    this.fs = fs
  }

  async readText(path: string): Promise<string> {
    return this.fs.readTextFile(path)
  }

  async writeText(path: string, content: string): Promise<void> {
    await this.fs.writeTextFile(path, content)
  }
}

