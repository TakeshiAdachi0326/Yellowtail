import {
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
  type UIEvent,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  DataGrid,
  renderTextEditor,
  type CellKeyDownArgs,
  type CellKeyboardEvent,
  type CellMouseArgs,
  type CellSelectArgs,
  type Column,
  type ColumnWidths,
  type DataGridHandle,
  type RenderCellProps,
  type RenderEditCellProps,
  type RenderHeaderCellProps,
} from 'react-data-grid'
import './SpecEditor.css'
import type { YellowtailRow } from '../core/yellowtail-engine'
import {
  DEFAULT_HEIGHT,
  DEFAULT_WIDTH,
  GRID_EXPAND_EDGE_PX,
  GRID_ROW_HEADER_COL_KEY,
  MIN_ROW_HEIGHT,
  makeCellKey,
  matrixToTsv,
  parseClipboardTsvToMatrix,
} from '../core/cell-map'

type SpecEditorProps = {
  columnHeaders: string[]
  data: Map<string, string>
  displayRowCount: number
  displayColCount: number
  colWidths: Map<number, number>
  rowHeights: Map<number, number>
  onCellDataChange?: (next: Map<string, string>) => void
  onColWidthsChange?: (next: Map<number, number>) => void
  onExpandNearBottom?: () => void
  onExpandNearRight?: () => void
  /** 貼り付けで必要ならグリッド表示サイズを拡張（行・列の最小件数）。 */
  onEnsureDisplaySize?: (minRows: number, minCols: number) => void
  onRowHeightChange?: (rowIndex: number, heightPx: number) => void
  /** セル編集以外（SELECT）で Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y */
  undoRedo?: {
    canUndo: boolean
    canRedo: boolean
    undo: () => void
    redo: () => void
  }
}

type GridRow = YellowtailRow & { __rowNumber: string }

/** データ列・行は 0 起点（行番号「1〜」列・データ A 列は含まないインデックス）。 */
export type GridSelection =
  | { kind: 'cell'; row: number; col: number }
  | { kind: 'column'; col: number }
  | { kind: 'row'; row: number }
  /** 矩形選択（次コミットで UI から設定予定）。端点は未正規化でも可。 */
  | { kind: 'range'; row0: number; col0: number; row1: number; col1: number }

type SelectionBounds = { row0: number; col0: number; row1: number; col1: number }

function selectionToBounds(
  sel: GridSelection,
  displayRows: number,
  displayCols: number,
): SelectionBounds {
  switch (sel.kind) {
    case 'cell':
      return { row0: sel.row, col0: sel.col, row1: sel.row, col1: sel.col }
    case 'column':
      return {
        row0: 0,
        col0: sel.col,
        row1: Math.max(0, displayRows - 1),
        col1: sel.col,
      }
    case 'row':
      return {
        row0: sel.row,
        col0: 0,
        row1: sel.row,
        col1: Math.max(0, displayCols - 1),
      }
    case 'range':
      return {
        row0: Math.min(sel.row0, sel.row1),
        col0: Math.min(sel.col0, sel.col1),
        row1: Math.max(sel.row0, sel.row1),
        col1: Math.max(sel.col0, sel.col1),
      }
  }
}

function boundsToTsv(data: Map<string, string>, b: SelectionBounds): string {
  const rows: string[][] = []
  for (let r = b.row0; r <= b.row1; r += 1) {
    const line: string[] = []
    for (let c = b.col0; c <= b.col1; c += 1) {
      line.push(data.get(makeCellKey(r, c)) ?? '')
    }
    rows.push(line)
  }
  return matrixToTsv(rows)
}

function clearBoundsInMap(next: Map<string, string>, b: SelectionBounds) {
  for (let r = b.row0; r <= b.row1; r += 1) {
    for (let c = b.col0; c <= b.col1; c += 1) {
      next.delete(makeCellKey(r, c))
    }
  }
}

/** @deprecated 互換用。`GridSelection` のセル選択と同じ形。 */
export type SelectedCellCoords = { row: number; col: number }

function toExcelColumnName(index: number): string {
  let current = index
  let result = ''

  while (current >= 0) {
    result = String.fromCharCode((current % 26) + 65) + result
    current = Math.floor(current / 26) - 1
  }

  return result
}

const ROW_NUMBER_KEY = '__rowNumber' as const

function buildRdgColumnWidths(
  colWidths: Map<number, number>,
  headers: string[],
  displayColCount: number,
): Map<string, { type: 'resized'; width: number }> {
  const m = new Map<string, { type: 'resized'; width: number }>()
  m.set(ROW_NUMBER_KEY, {
    type: 'resized',
    width: colWidths.get(GRID_ROW_HEADER_COL_KEY) ?? DEFAULT_WIDTH,
  })
  headers.slice(0, displayColCount).forEach((h, i) => {
    m.set(h, { type: 'resized', width: colWidths.get(i) ?? DEFAULT_WIDTH })
  })
  return m
}

function columnWidthsToColWidths(
  cw: ColumnWidths,
  headers: string[],
  displayColCount: number,
): Map<number, number> {
  const next = new Map<number, number>()
  const rowEntry = cw.get(ROW_NUMBER_KEY)
  if (rowEntry !== undefined && typeof rowEntry.width === 'number') {
    next.set(GRID_ROW_HEADER_COL_KEY, rowEntry.width)
  }
  headers.slice(0, displayColCount).forEach((h, i) => {
    const entry = cw.get(h)
    if (entry !== undefined && typeof entry.width === 'number') {
      next.set(i, entry.width)
    }
  })
  return next
}

const GRID_EXPAND_SCROLL_THROTTLE_MS = 280

export function SpecEditor({
  columnHeaders,
  data,
  displayRowCount,
  displayColCount,
  colWidths,
  rowHeights,
  onCellDataChange,
  onColWidthsChange,
  onExpandNearBottom,
  onExpandNearRight,
  onEnsureDisplaySize,
  onRowHeightChange,
  undoRedo,
}: SpecEditorProps) {
  const headers = columnHeaders

  const [selection, setSelection] = useState<GridSelection | null>(null)
  const [isEditing, setIsEditing] = useState(false)

  const gridRef = useRef<DataGridHandle>(null)
  /** 列見出し（A〜）クリック直後の `selectCell` で単一セル扱いに上書きされないようにする */
  const columnHeaderSelectRef = useRef<number | null>(null)
  const expandThrottleRef = useRef({ bottom: 0, right: 0 })

  const handleGridScroll = useCallback(
    (event: UIEvent<HTMLDivElement>) => {
      const el = event.currentTarget
      const { scrollLeft, scrollTop, clientWidth, clientHeight, scrollWidth, scrollHeight } = el
      const edge = GRID_EXPAND_EDGE_PX
      const now = performance.now()

      if (
        scrollWidth - clientWidth > 2 &&
        scrollLeft + clientWidth >= scrollWidth - edge &&
        now - expandThrottleRef.current.right >= GRID_EXPAND_SCROLL_THROTTLE_MS
      ) {
        expandThrottleRef.current.right = now
        onExpandNearRight?.()
      }

      if (
        scrollHeight - clientHeight > 2 &&
        scrollTop + clientHeight >= scrollHeight - edge &&
        now - expandThrottleRef.current.bottom >= GRID_EXPAND_SCROLL_THROTTLE_MS
      ) {
        expandThrottleRef.current.bottom = now
        onExpandNearBottom?.()
      }
    },
    [onExpandNearBottom, onExpandNearRight],
  )

  const rowResizeDragRef = useRef<{ startY: number; startH: number; rowIdx: number } | null>(null)

  const handleRowResizePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>, rowIdx: number) => {
      if (event.button !== 0) {
        return
      }
      event.preventDefault()
      event.stopPropagation()
      const startH = rowHeights.get(rowIdx) ?? DEFAULT_HEIGHT
      rowResizeDragRef.current = { startY: event.clientY, startH, rowIdx }
      event.currentTarget.setPointerCapture(event.pointerId)
    },
    [rowHeights],
  )

  const handleRowResizePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const d = rowResizeDragRef.current
      if (!d) {
        return
      }
      const delta = event.clientY - d.startY
      const nextH = Math.max(MIN_ROW_HEIGHT, d.startH + delta)
      onRowHeightChange?.(d.rowIdx, nextH)
    },
    [onRowHeightChange],
  )

  const endRowResize = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (rowResizeDragRef.current) {
      rowResizeDragRef.current = null
      try {
        event.currentTarget.releasePointerCapture(event.pointerId)
      } catch {
        /* already released */
      }
    }
  }, [])

  const rdgColumnWidths = useMemo(
    () => buildRdgColumnWidths(colWidths, headers, displayColCount),
    [colWidths, headers, displayColCount],
  )

  const handleColumnWidthsChange = useCallback(
    (next: ColumnWidths) => {
      const extracted = columnWidthsToColWidths(next, headers, displayColCount)
      const merged = new Map(colWidths)
      extracted.forEach((w, k) => merged.set(k, w))
      onColWidthsChange?.(merged)
    },
    [colWidths, headers, displayColCount, onColWidthsChange],
  )

  const dataColumnIndex = useCallback(
    (columnKey: string | unknown): number | null => {
      const key = String(columnKey)
      if (key === ROW_NUMBER_KEY) {
        return null
      }
      const idx = headers.slice(0, displayColCount).indexOf(key)
      return idx >= 0 ? idx : null
    },
    [headers, displayColCount],
  )

  const handleSelectedCellChange = useCallback(
    (args: CellSelectArgs<GridRow>) => {
      const { rowIdx, column } = args
      const dataCol = dataColumnIndex(column.key)
      if (column.key === ROW_NUMBER_KEY) {
        setSelection({ kind: 'row', row: rowIdx })
        setIsEditing(false)
        return
      }
      if (dataCol === null) {
        setSelection(null)
        return
      }
      const pendingCol = columnHeaderSelectRef.current
      if (pendingCol !== null && dataCol === pendingCol) {
        columnHeaderSelectRef.current = null
        setSelection({ kind: 'column', col: pendingCol })
        setIsEditing(false)
        return
      }
      setSelection({ kind: 'cell', row: rowIdx, col: dataCol })
    },
    [dataColumnIndex],
  )

  const wrapRenderEditCell = useCallback((props: RenderEditCellProps<GridRow>) => {
    const { onClose } = props
    return renderTextEditor({
      ...props,
      onClose: (commitChanges?: boolean, shouldFocusCell?: boolean) => {
        setIsEditing(false)
        onClose(commitChanges, shouldFocusCell)
      },
    })
  }, [])

  const columns = useMemo<Column<GridRow>[]>(() => {
    const cellDivStyle = (colIndex: number) => {
      const w = colWidths.get(colIndex) ?? DEFAULT_WIDTH
      return {
        width: w,
        height: '100%' as const,
        boxSizing: 'border-box' as const,
        overflow: 'hidden' as const,
        display: 'flex' as const,
        alignItems: 'center' as const,
      }
    }

    const rowNumberColumn: Column<GridRow> = {
      key: ROW_NUMBER_KEY,
      name: '#',
      width: colWidths.get(GRID_ROW_HEADER_COL_KEY) ?? DEFAULT_WIDTH,
      editable: false,
      resizable: true,
      frozen: true,
      renderCell: ({ row }: RenderCellProps<GridRow>) => {
        const rowIdx = Number(row.__rowNumber) - 1
        const w = colWidths.get(GRID_ROW_HEADER_COL_KEY) ?? DEFAULT_WIDTH
        const rowSel = selection?.kind === 'row' && selection.row === rowIdx
        return (
          <div
            style={{
              position: 'relative',
              width: w,
              height: '100%',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
              ...(rowSel
                ? {
                    backgroundColor:
                      'color-mix(in srgb, var(--rdg-selection-color, hsl(207 100% 50%)) 18%, transparent)',
                  }
                : {}),
            }}
            data-spec-selected={rowSel ? 'true' : undefined}
            data-spec-row-header-selected={rowSel ? 'true' : undefined}
          >
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                overflow: 'hidden',
                minHeight: 0,
              }}
            >
              {row.__rowNumber}
            </div>
            <div
              className="spec-row-resize-handle"
              role="separator"
              aria-orientation="horizontal"
              aria-label={`行 ${row.__rowNumber} の高さを変更`}
              onPointerDown={(e) => handleRowResizePointerDown(e, rowIdx)}
              onPointerMove={handleRowResizePointerMove}
              onPointerUp={endRowResize}
              onPointerCancel={endRowResize}
            />
          </div>
        )
      },
    }

    const editableColumns = headers.slice(0, displayColCount).map((header, index) => ({
      key: header,
      name: toExcelColumnName(index),
      editable: true,
      resizable: true,
      width: colWidths.get(index) ?? DEFAULT_WIDTH,
      renderHeaderCell: (headerProps: RenderHeaderCellProps<GridRow>) => (
        <div
          tabIndex={headerProps.tabIndex}
          className="spec-column-header-label"
          onClick={(e) => {
            if ((e.target as HTMLElement).closest?.('[class*="rdg-resize-handle"]')) {
              return
            }
            e.preventDefault()
            e.stopPropagation()
            columnHeaderSelectRef.current = index
            setIsEditing(false)
            setSelection({ kind: 'column', col: index })
            queueMicrotask(() => {
              gridRef.current?.selectCell({ rowIdx: 0, idx: index + 1 }, { shouldFocusCell: true })
            })
          }}
        >
          {toExcelColumnName(index)}
        </div>
      ),
      renderEditCell: wrapRenderEditCell,
      renderCell: ({ row, rowIdx }: RenderCellProps<GridRow>) => {
        const cellSel = selection?.kind === 'cell' && selection.row === rowIdx && selection.col === index
        const colSel = selection?.kind === 'column' && selection.col === index
        const rowSel = selection?.kind === 'row' && selection.row === rowIdx
        const rangeSel =
          selection?.kind === 'range' &&
          rowIdx >= Math.min(selection.row0, selection.row1) &&
          rowIdx <= Math.max(selection.row0, selection.row1) &&
          index >= Math.min(selection.col0, selection.col1) &&
          index <= Math.max(selection.col0, selection.col1)
        const highlighted = cellSel || colSel || rowSel || rangeSel
        const editingHere = isEditing && cellSel
        return (
          <div
            style={{
              ...cellDivStyle(index),
              ...(highlighted
                ? {
                    backgroundColor:
                      'color-mix(in srgb, var(--rdg-selection-color, hsl(207 100% 50%)) 18%, transparent)',
                  }
                : {}),
            }}
            data-spec-selected={highlighted ? 'true' : undefined}
            data-spec-col-selected={colSel ? 'true' : undefined}
            data-spec-row-selected={rowSel ? 'true' : undefined}
            data-spec-editing={editingHere ? 'true' : undefined}
          >
            {String(row[header] ?? '')}
          </div>
        )
      },
    }))

    return [rowNumberColumn, ...editableColumns]
  }, [
    headers,
    colWidths,
    displayColCount,
    handleRowResizePointerDown,
    handleRowResizePointerMove,
    endRowResize,
    wrapRenderEditCell,
    selection,
    isEditing,
  ])

  const gridRows = useMemo<GridRow[]>(() => {
    const rows: GridRow[] = []
    const effectiveHeaders = headers.slice(0, displayColCount)

    for (let r = 0; r < displayRowCount; r += 1) {
      const row: GridRow = { __rowNumber: String(r + 1) }
      for (let c = 0; c < effectiveHeaders.length; c += 1) {
        const key = effectiveHeaders[c]
        row[key] = data.get(makeCellKey(r, c)) ?? ''
      }
      rows.push(row)
    }

    return rows
  }, [data, headers, displayRowCount, displayColCount])

  const handleRowsChange = (nextRows: GridRow[]) => {
    const next = new Map(data)
    const effectiveHeaders = headers.slice(0, displayColCount)

    for (let r = 0; r < displayRowCount; r += 1) {
      const row = nextRows[r]
      if (!row) {
        continue
      }
      for (let c = 0; c < effectiveHeaders.length; c += 1) {
        const headerKey = effectiveHeaders[c]
        const value = String(row[headerKey] ?? '')
        const sparseKey = makeCellKey(r, c)

        if (value === '') {
          next.delete(sparseKey)
        } else {
          next.set(sparseKey, value)
        }
      }
    }

    onCellDataChange?.(next)
  }

  const rowHeightForRow = (row: GridRow) => {
    const rowIdx = Number(row.__rowNumber) - 1
    if (!Number.isInteger(rowIdx) || rowIdx < 0) {
      return DEFAULT_HEIGHT
    }
    return rowHeights.get(rowIdx) ?? DEFAULT_HEIGHT
  }

  const handleCellClick = (args: CellMouseArgs<GridRow>, event: MouseEvent) => {
    if (event.detail >= 2) {
      return
    }
    args.selectCell(false)
    setIsEditing(false)
  }

  const handleCellDoubleClick = (args: CellMouseArgs<GridRow>) => {
    if (args.column.key === ROW_NUMBER_KEY) {
      return
    }
    args.selectCell(true)
    setIsEditing(true)
  }

  const handleCellKeyDown = useCallback(
    (args: CellKeyDownArgs<GridRow>, event: CellKeyboardEvent) => {
      const isMod = event.ctrlKey || event.metaKey
      if (!isMod) {
        return
      }
      const key = event.key.toLowerCase()

      if (args.mode === 'SELECT' && undoRedo) {
        if (key === 'z' && !event.shiftKey && undoRedo.canUndo) {
          event.preventGridDefault()
          undoRedo.undo()
          return
        }
        if (((key === 'z' && event.shiftKey) || key === 'y') && undoRedo.canRedo) {
          event.preventGridDefault()
          undoRedo.redo()
          return
        }
      }

      if (key !== 'c' && key !== 'v' && key !== 'x') {
        return
      }
      if (args.mode === 'EDIT') {
        return
      }
      if (args.mode !== 'SELECT') {
        return
      }

      const ch = key
      const { rowIdx, column } = args
      const colFromArgs = dataColumnIndex(column.key)

      const copyBounds = (): SelectionBounds | null => {
        if (selection !== null) {
          return selectionToBounds(selection, displayRowCount, displayColCount)
        }
        if (colFromArgs === null) {
          return null
        }
        return { row0: rowIdx, col0: colFromArgs, row1: rowIdx, col1: colFromArgs }
      }

      const pasteAnchor = (): { row: number; col: number } | null => {
        if (!selection || selection.kind === 'cell') {
          if (colFromArgs === null) {
            return null
          }
          return { row: rowIdx, col: colFromArgs }
        }
        if (selection.kind === 'column') {
          return { row: rowIdx, col: selection.col }
        }
        if (selection.kind === 'row') {
          // 行選択時フォーカスは行番号列にあり colFromArgs は null。以前触った列の ref を使うと常に横ずれする。
          // データ列にフォーカスがあるときは単一セル選択に降りるため、ここでは「行頭（0 列）」を既定にする。
          return { row: selection.row, col: colFromArgs ?? 0 }
        }
        if (selection.kind === 'range') {
          return {
            row: Math.min(selection.row0, selection.row1),
            col: Math.min(selection.col0, selection.col1),
          }
        }
        return null
      }

      if (ch === 'c' || ch === 'x') {
        const b = copyBounds()
        if (!b) {
          return
        }
        event.preventGridDefault()
        const tsv = boundsToTsv(data, b)
        void navigator.clipboard.writeText(tsv)
        if (ch === 'x') {
          const next = new Map(data)
          clearBoundsInMap(next, b)
          onCellDataChange?.(next)
        }
        return
      }

      if (ch === 'v') {
        const anchor = pasteAnchor()
        if (!anchor) {
          return
        }
        event.preventGridDefault()
        void navigator.clipboard.readText().then((text) => {
          const matrix = parseClipboardTsvToMatrix(text)
          const pasteRows = matrix.length
          let pasteCols = 0
          for (const row of matrix) {
            pasteCols = Math.max(pasteCols, row.length)
          }
          if (pasteCols === 0) {
            pasteCols = 1
          }
          const needRows = anchor.row + pasteRows
          const needCols = anchor.col + pasteCols
          onEnsureDisplaySize?.(needRows, needCols)
          const next = new Map(data)
          for (let dr = 0; dr < pasteRows; dr += 1) {
            const line = matrix[dr]
            for (let dc = 0; dc < pasteCols; dc += 1) {
              const v = line[dc] ?? ''
              const r = anchor.row + dr
              const c = anchor.col + dc
              const k = makeCellKey(r, c)
              if (v === '') {
                next.delete(k)
              } else {
                next.set(k, v)
              }
            }
          }
          onCellDataChange?.(next)
        })
      }
    },
    [
      data,
      dataColumnIndex,
      displayColCount,
      displayRowCount,
      onCellDataChange,
      onEnsureDisplaySize,
      selection,
      undoRedo,
    ],
  )

  if (headers.length === 0) {
    return <p>No table data found.</p>
  }

  return (
    <div className="spec-editor-viewport">
      <DataGrid
        ref={gridRef}
        columns={columns}
        rows={gridRows}
        rowKeyGetter={(row) => row.__rowNumber}
        columnWidths={rdgColumnWidths}
        onColumnWidthsChange={handleColumnWidthsChange}
        rowHeight={rowHeightForRow}
        headerRowHeight={DEFAULT_HEIGHT}
        onRowsChange={handleRowsChange}
        onSelectedCellChange={handleSelectedCellChange}
        onCellClick={handleCellClick}
        onCellDoubleClick={handleCellDoubleClick}
        onCellKeyDown={handleCellKeyDown}
        onScroll={handleGridScroll}
        enableVirtualization
        className="fill-grid"
        style={{ width: '100%', height: '100%', maxWidth: '100%', boxSizing: 'border-box' }}
      />
    </div>
  )
}
