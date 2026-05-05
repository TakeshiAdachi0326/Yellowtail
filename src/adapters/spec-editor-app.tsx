import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import {
  COL_WIDTH_DEFAULT,
  ROW_HEIGHT_DEFAULT,
  applyHistoryEntry,
  diffCellMaps,
  diffSparseNumMaps,
  historyEntryIsEmpty,
  numMapPatchIsEmpty,
  patchIsEmpty,
  type EditorHistoryEntry,
  type GridLayoutSnapshot,
} from '../core/editor-history'
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

/**
 * undo / redo の最大段数。
 * パッチ方式ならこの程度まで余裕で伸ばせる（`editor-history.ts` 冒頭コメント参照）。
 */
const EDITOR_HISTORY_LIMIT = 100

type EditorBaseline = {
  cellData: Map<string, string>
  colWidths: Map<number, number>
  rowHeights: Map<number, number>
  gridRowCount: number
  gridColCount: number
  columnHeaders: string[]
}

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

  const initialBaseline = useMemo<EditorBaseline>(
    () => ({
      cellData: seeded.cells,
      colWidths: new Map(),
      rowHeights: new Map(),
      gridRowCount: INITIAL_GRID_ROWS,
      gridColCount: INITIAL_GRID_COLS,
      columnHeaders: seeded.headers,
    }),
    [seeded.cells, seeded.headers],
  )

  const [columnHeaders, setColumnHeaders] = useState<string[]>(() => initialBaseline.columnHeaders)

  const [cellData, setCellData] = useState<Map<string, string>>(() => initialBaseline.cellData)

  const [editorPast, setEditorPast] = useState<EditorHistoryEntry[]>([])
  const [editorFuture, setEditorFuture] = useState<EditorHistoryEntry[]>([])

  const [gridRowCount, setGridRowCount] = useState(initialBaseline.gridRowCount)

  const [gridColCount, setGridColCount] = useState(initialBaseline.gridColCount)

  const [colWidths, setColWidths] = useState<Map<number, number>>(() => initialBaseline.colWidths)

  const [rowHeights, setRowHeights] = useState<Map<number, number>>(() => initialBaseline.rowHeights)

  const [saveMessage, setSaveMessage] = useState<string>('')

  const editorBaselineRef = useRef<EditorBaseline>(initialBaseline)

  const pushHistory = useCallback((fragment: EditorHistoryEntry) => {
    if (historyEntryIsEmpty(fragment)) {
      return
    }
    setEditorPast((p) => [...p, fragment].slice(-EDITOR_HISTORY_LIMIT))
    setEditorFuture([])
  }, [])

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
        const nextCells = yellowtailRowsToCellMap(restoredRows, padded)
        setColumnHeaders(padded)
        setGridColCount(colCount)
        setGridRowCount(rowCount)
        setCellData(nextCells)
        setColWidths(new Map())
        setRowHeights(new Map())
        setEditorPast([])
        setEditorFuture([])
        editorBaselineRef.current = {
          cellData: nextCells,
          colWidths: new Map(),
          rowHeights: new Map(),
          gridRowCount: rowCount,
          gridColCount: colCount,
          columnHeaders: padded,
        }
      }
    }

    void load()
  }, [storageAdapter, storageKey])

  const handleCellDataChange = (next: Map<string, string>) => {
    const b = editorBaselineRef.current
    const { undo, redo } = diffCellMaps(b.cellData, next)
    if (!patchIsEmpty(undo)) {
      pushHistory({ cells: { undo, redo } })
    }
    editorBaselineRef.current = { ...b, cellData: next }
    setCellData(next)
    setSaveMessage('')
  }

  const handleColWidthsChange = (next: Map<number, number>) => {
    const b = editorBaselineRef.current
    const pair = diffSparseNumMaps(b.colWidths, next, COL_WIDTH_DEFAULT)
    if (!numMapPatchIsEmpty(pair.undo)) {
      pushHistory({ colWidths: pair })
    }
    editorBaselineRef.current = { ...b, colWidths: next }
    setColWidths(next)
  }

  const handleExpandNearRight = () => {
    const b = editorBaselineRef.current
    const nextCols = b.gridColCount + GRID_EXPAND_COL_CHUNK
    const nextHeaders = padColumnHeaders(b.columnHeaders, nextCols)
    const undo: GridLayoutSnapshot = {
      displayRowCount: b.gridRowCount,
      displayColCount: b.gridColCount,
      columnHeaders: [...b.columnHeaders],
    }
    const redo: GridLayoutSnapshot = {
      displayRowCount: b.gridRowCount,
      displayColCount: nextCols,
      columnHeaders: nextHeaders,
    }
    pushHistory({ gridLayout: { undo, redo } })
    editorBaselineRef.current = {
      ...b,
      gridColCount: nextCols,
      columnHeaders: nextHeaders,
    }
    setGridColCount(nextCols)
    setColumnHeaders(nextHeaders)
  }

  const handleExpandNearBottom = () => {
    const b = editorBaselineRef.current
    const nextRows = b.gridRowCount + GRID_EXPAND_ROW_CHUNK
    const undo: GridLayoutSnapshot = {
      displayRowCount: b.gridRowCount,
      displayColCount: b.gridColCount,
      columnHeaders: [...b.columnHeaders],
    }
    const redo: GridLayoutSnapshot = {
      displayRowCount: nextRows,
      displayColCount: b.gridColCount,
      columnHeaders: [...b.columnHeaders],
    }
    pushHistory({ gridLayout: { undo, redo } })
    editorBaselineRef.current = {
      ...b,
      gridRowCount: nextRows,
    }
    setGridRowCount(nextRows)
  }

  const handleEnsureDisplaySize = (minRows: number, minCols: number) => {
    const b = editorBaselineRef.current
    const nextRows = Math.max(b.gridRowCount, minRows)
    const nextCols = Math.max(b.gridColCount, minCols)
    if (nextRows === b.gridRowCount && nextCols === b.gridColCount) {
      return
    }
    const nextHeaders = padColumnHeaders(b.columnHeaders, nextCols)
    const undo: GridLayoutSnapshot = {
      displayRowCount: b.gridRowCount,
      displayColCount: b.gridColCount,
      columnHeaders: [...b.columnHeaders],
    }
    const redo: GridLayoutSnapshot = {
      displayRowCount: nextRows,
      displayColCount: nextCols,
      columnHeaders: nextHeaders,
    }
    pushHistory({ gridLayout: { undo, redo } })
    editorBaselineRef.current = {
      ...b,
      gridRowCount: nextRows,
      gridColCount: nextCols,
      columnHeaders: nextHeaders,
    }
    setGridRowCount(nextRows)
    setGridColCount(nextCols)
    setColumnHeaders(nextHeaders)
  }

  const handleRowHeightChange = (rowIndex: number, heightPx: number) => {
    const b = editorBaselineRef.current
    const prev = b.rowHeights
    const next = new Map(prev)
    next.set(rowIndex, heightPx)
    const pair = diffSparseNumMaps(prev, next, ROW_HEIGHT_DEFAULT)
    if (!numMapPatchIsEmpty(pair.undo)) {
      pushHistory({ rowHeights: pair })
    }
    editorBaselineRef.current = { ...b, rowHeights: next }
    setRowHeights(next)
    setSaveMessage('')
  }

  const applyStep = useCallback((entry: EditorHistoryEntry, direction: 'undo' | 'redo') => {
    const b = editorBaselineRef.current
    const result = applyHistoryEntry(entry, direction, {
      cellData: b.cellData,
      colWidths: b.colWidths,
      rowHeights: b.rowHeights,
      gridRowCount: b.gridRowCount,
      gridColCount: b.gridColCount,
      columnHeaders: b.columnHeaders,
    })
    editorBaselineRef.current = {
      cellData: result.cellData,
      colWidths: result.colWidths,
      rowHeights: result.rowHeights,
      gridRowCount: result.gridLayout?.displayRowCount ?? b.gridRowCount,
      gridColCount: result.gridLayout?.displayColCount ?? b.gridColCount,
      columnHeaders: result.gridLayout
        ? [...result.gridLayout.columnHeaders]
        : [...b.columnHeaders],
    }
    setCellData(result.cellData)
    setColWidths(result.colWidths)
    setRowHeights(result.rowHeights)
    if (result.gridLayout) {
      setGridRowCount(result.gridLayout.displayRowCount)
      setGridColCount(result.gridLayout.displayColCount)
      setColumnHeaders(result.gridLayout.columnHeaders)
    }
    setSaveMessage('')
  }, [])

  const performUndo = useCallback(() => {
    setEditorPast((p) => {
      if (p.length === 0) {
        return p
      }
      const entry = p[p.length - 1]!
      const rest = p.slice(0, -1)
      applyStep(entry, 'undo')
      setEditorFuture((f) => [...f, entry])
      return rest
    })
  }, [applyStep])

  const performRedo = useCallback(() => {
    setEditorFuture((f) => {
      if (f.length === 0) {
        return f
      }
      const entry = f[f.length - 1]!
      const rest = f.slice(0, -1)
      applyStep(entry, 'redo')
      setEditorPast((p) => [...p, entry].slice(-EDITOR_HISTORY_LIMIT))
      return rest
    })
  }, [applyStep])

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
      undoRedo={{
        canUndo: editorPast.length > 0,
        canRedo: editorFuture.length > 0,
        undo: performUndo,
        redo: performRedo,
      }}
    />
  )
}
