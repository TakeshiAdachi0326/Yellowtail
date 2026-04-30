import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { SpecEditor } from './components/SpecEditor'
import type { StorageAdapter } from './core/storage/storage-adapter'
import {
  parseMarkdownTableToJson,
  stringifyJsonToMarkdownTable,
  type YellowtailRow,
} from './core/yellowtail-engine'

const SAMPLE_SPEC_MARKDOWN = `
| id | feature | test_case | expected |
| --- | --- | --- | --- |
| TC-001 | Login | Valid credentials | User can sign in |
| TC-002 | Login | Invalid password | Error message is shown |
| TC-003 | Password Reset | Valid email | Reset mail is sent |
`.trim()

const DEFAULT_SPEC_STORAGE_KEY = 'yellowtail/current.spec'

type AppProps = {
  storageAdapter: StorageAdapter
  storageKey?: string
}

function App({ storageAdapter, storageKey = DEFAULT_SPEC_STORAGE_KEY }: AppProps) {
  const fallbackRows = useMemo(() => parseMarkdownTableToJson(SAMPLE_SPEC_MARKDOWN), [])
  const [rows, setRows] = useState<YellowtailRow[]>(fallbackRows)
  const [saveMessage, setSaveMessage] = useState<string>('')

  useEffect(() => {
    const load = async () => {
      const savedSpec = await storageAdapter.readText(storageKey)
      if (!savedSpec.trim()) {
        return
      }

      const restoredRows = parseMarkdownTableToJson(savedSpec)
      if (restoredRows.length > 0) {
        setRows(restoredRows)
      }
    }

    void load()
  }, [storageAdapter, storageKey])

  const handleRowsChange = (nextRows: YellowtailRow[]) => {
    setRows(nextRows)
    setSaveMessage('')
    console.log('[Yellowtail] Updated JSON in memory:', nextRows)
  }

  const handleSaveSpec = async () => {
    const markdown = stringifyJsonToMarkdownTable(rows)
    if (!markdown.trim()) {
      console.warn('[Yellowtail] No table data to export.')
      setSaveMessage('保存対象のデータがありません。')
      return
    }

    await storageAdapter.writeText(storageKey, markdown)
    setSaveMessage(`保存しました（${storageAdapter.environment}）。`)
  }

  return (
    <main style={{ padding: '24px', display: 'grid', gap: '16px' }}>
      <h1>Yellowtail Spec Editor (Phase 3)</h1>
      <p>
        A1 (先頭セル) を編集すると、JSON/Markdown が更新されます。保存ボタンで
        `StorageAdapter` 経由の保存を確認できます。
      </p>

      <div style={{ height: 320 }}>
        <SpecEditor initialRows={rows} onRowsChange={handleRowsChange} />
      </div>

      <section>
        <button type="button" onClick={() => void handleSaveSpec()}>
          保存（StorageAdapter経由）
        </button>
        {saveMessage ? <p>{saveMessage}</p> : null}
      </section>

      <section>
        <h2>JSON Preview</h2>
        <pre>{JSON.stringify(rows, null, 2)}</pre>
      </section>
      <section>
        <h2>Markdown Preview</h2>
        <pre>{stringifyJsonToMarkdownTable(rows)}</pre>
      </section>
    </main>
  )
}

export default App
