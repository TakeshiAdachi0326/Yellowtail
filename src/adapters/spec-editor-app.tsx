import { useEffect, useMemo, useState } from 'react'
import App from '../App'
import type { StorageAdapter } from '../core/storage/storage-adapter'
import {
  parseMarkdownTableToJson,
  stringifyJsonToMarkdownTable,
  type YellowtailRow,
} from '../core/yellowtail-engine'

const SAMPLE_SPEC_MARKDOWN = `
| id | feature | test_case | expected |
| --- | --- | --- | --- |
| TC-001 | Login | Valid credentials | User can sign in |
| TC-002 | Login | Invalid password | Error message is shown |
| TC-003 | Password Reset | Valid email | Reset mail is sent |
`.trim()

const DEFAULT_SPEC_STORAGE_KEY = 'yellowtail/current.spec'

type SpecEditorAppProps = {
  storageAdapter: StorageAdapter
  storageKey?: string
}

export function SpecEditorApp({
  storageAdapter,
  storageKey = DEFAULT_SPEC_STORAGE_KEY,
}: SpecEditorAppProps) {
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
  }

  const handleSave = () => {
    void (async () => {
      const markdown = stringifyJsonToMarkdownTable(rows)
      if (!markdown.trim()) {
        setSaveMessage('保存対象のデータがありません。')
        return
      }

      await storageAdapter.writeText(storageKey, markdown)
      setSaveMessage(`保存しました（${storageAdapter.environment}）。`)
    })()
  }

  return (
    <App
      rows={rows}
      saveMessage={saveMessage}
      storageEnvironment={storageAdapter.environment}
      onRowsChange={handleRowsChange}
      onSave={handleSave}
    />
  )
}
