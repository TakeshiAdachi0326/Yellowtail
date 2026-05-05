import { useEffect, useMemo, useState } from 'react'
import App from '../App'
import {
  GRID_EXPAND_COL_CHUNK,
  GRID_EXPAND_ROW_CHUNK,
  INITIAL_GRID_COLS,
  INITIAL_GRID_ROWS,
  cellMapToYellowtailRows,
  inferExtentsFromCellMap,
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
    const headers = padColumnHeaders(Object.keys(fallbackRows[0] ?? {}), INITIAL_GRID_COLS)
    return {
      headers,
      cells: yellowtailRowsToCellMap(fallbackRows, headers),
    }
  }, [fallbackRows])

  const [columnHeaders, setColumnHeaders] = useState<string[]>(() => seeded.headers)

  const [cellData, setCellData] = useState<Map<string, string>>(() => seeded.cells)

  const [gridRowCount, setGridRowCount] = useState(INITIAL_GRID_ROWS)

  const [gridColCount, setGridColCount] = useState(INITIAL_GRID_COLS)

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
        const draftHeaders = padColumnHeaders(keys, keys.length)
        const draftCells = yellowtailRowsToCellMap(restoredRows, draftHeaders)
        const ext = inferExtentsFromCellMap(draftCells)
        const colCount = Math.max(INITIAL_GRID_COLS, keys.length, ext.maxCol + 1)
        const rowCount = Math.max(INITIAL_GRID_ROWS, restoredRows.length, ext.maxRow + 1)
        const padded = padColumnHeaders(keys, colCount)
        setColumnHeaders(padded)
        setGridColCount(colCount)
        setGridRowCount(rowCount)
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

  const handleExpandNearRight = () => {
    setGridColCount((prev) => {
      const next = prev + GRID_EXPAND_COL_CHUNK
      setColumnHeaders((h) => padColumnHeaders(h, next))
      return next
    })
  }

  const handleExpandNearBottom = () => {
    setGridRowCount((n) => n + GRID_EXPAND_ROW_CHUNK)
  }

  const handleEnsureDisplaySize = (minRows: number, minCols: number) => {
    setGridRowCount((prev) => Math.max(prev, minRows))
    setGridColCount((prev) => {
      const next = Math.max(prev, minCols)
      setColumnHeaders((h) => padColumnHeaders(h, next))
      return next
    })
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
      displayRowCount={gridRowCount}
      displayColCount={gridColCount}
      colWidths={colWidths}
      rowHeights={rowHeights}
      rowsForExport={rowsForExport}
      saveMessage={saveMessage}
      storageEnvironment={storageAdapter.environment}
      onCellDataChange={handleCellDataChange}
      onColWidthsChange={handleColWidthsChange}
      onExpandNearBottom={handleExpandNearBottom}
      onExpandNearRight={handleExpandNearRight}
      onEnsureDisplaySize={handleEnsureDisplaySize}
      onRowHeightChange={handleRowHeightChange}
      onSave={handleSave}
    />
  )
}
