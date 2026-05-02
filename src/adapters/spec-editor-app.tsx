import { useEffect, useMemo, useState } from 'react'
import App from '../App'
import {
  SPEC_GRID_DISPLAY_COLS,
  cellMapToYellowtailRows,
  padColumnHeaders,
  yellowtailRowsToCellMap,
} from '../core/cell-map'
import type { StorageAdapter } from '../core/storage/storage-adapter'
import {
  parseMarkdownTableToJson,
  stringifyJsonToMarkdownTable,
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

  const seeded = useMemo(() => {
    const headers = padColumnHeaders(Object.keys(fallbackRows[0] ?? {}), SPEC_GRID_DISPLAY_COLS)
    return {
      headers,
      cells: yellowtailRowsToCellMap(fallbackRows, headers),
    }
  }, [fallbackRows])

  const [columnHeaders, setColumnHeaders] = useState<string[]>(() => seeded.headers)

  const [cellData, setCellData] = useState<Map<string, string>>(() => seeded.cells)

  const [colWidths, setColWidths] = useState<Map<number, number>>(() => new Map())

  const [rowHeights, setRowHeights] = useState<Map<number, number>>(() => new Map())

  const [saveMessage, setSaveMessage] = useState<string>('')

  const rowsForExport = useMemo(
    () => cellMapToYellowtailRows(cellData, columnHeaders),
    [cellData, columnHeaders],
  )

  useEffect(() => {
    const load = async () => {
      const savedSpec = await storageAdapter.readText(storageKey)
      if (!savedSpec.trim()) {
        return
      }

      const restoredRows = parseMarkdownTableToJson(savedSpec)
      if (restoredRows.length > 0) {
        const keys = Object.keys(restoredRows[0])
        const padded = padColumnHeaders(keys, SPEC_GRID_DISPLAY_COLS)
        setColumnHeaders(padded)
        setCellData(yellowtailRowsToCellMap(restoredRows, padded))
      }
    }

    void load()
  }, [storageAdapter, storageKey])

  const handleCellDataChange = (next: Map<string, string>) => {
    setCellData(next)
    setSaveMessage('')
  }

  const handleColWidthsChange = (next: Map<number, number>) => {
    setColWidths(next)
  }

  const handleRowHeightChange = (rowIndex: number, heightPx: number) => {
    setRowHeights((prev) => {
      const next = new Map(prev)
      next.set(rowIndex, heightPx)
      return next
    })
    setSaveMessage('')
  }

  const handleSave = () => {
    void (async () => {
      const markdown = stringifyJsonToMarkdownTable(rowsForExport)
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
      columnHeaders={columnHeaders}
      cellData={cellData}
      colWidths={colWidths}
      rowHeights={rowHeights}
      rowsForExport={rowsForExport}
      saveMessage={saveMessage}
      storageEnvironment={storageAdapter.environment}
      onCellDataChange={handleCellDataChange}
      onColWidthsChange={handleColWidthsChange}
      onRowHeightChange={handleRowHeightChange}
      onSave={handleSave}
    />
  )
}
