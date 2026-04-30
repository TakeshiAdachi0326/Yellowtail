import type { StorageAdapter, VSCodeFsPort } from '../core/storage/storage-adapter'

/**
 * VSCode拡張/Node側で `vscode.workspace.fs` を注入して使う想定。
 *
 * - `path` は vscode.workspace.fs が期待する URI を文字列化したもの（例: `uri.toString()`）
 * - Web実行では使わないため、このファイルは App から直接参照しない構造を推奨
 */
export class VSCodeStorageAdapter implements StorageAdapter {
  readonly environment = 'vscode' as const

  private readonly fs: VSCodeFsPort

  constructor(fs: VSCodeFsPort) {
    this.fs = fs
  }

  async readText(path: string): Promise<string> {
    const bytes = await this.fs.readFile(path)
    return new TextDecoder('utf-8').decode(bytes)
  }

  async writeText(path: string, content: string): Promise<void> {
    const bytes = new TextEncoder().encode(content)
    await this.fs.writeFile(path, bytes)
  }
}

