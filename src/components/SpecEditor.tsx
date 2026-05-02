import {
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
  type UIEvent,
  useCallback,
  useMemo,
  useRef,
} from 'react'
import {
  DataGrid,
  renderTextEditor,
  type CellMouseArgs,
  type Column,
  type ColumnWidths,
  type RenderCellProps,
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
  onRowHeightChange?: (rowIndex: number, heightPx: number) => void
}

type GridRow = YellowtailRow & { __rowNumber: string }

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
  onRowHeightChange,
}: SpecEditorProps) {
  const headers = columnHeaders

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
            }}
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
      renderEditCell: renderTextEditor,
      renderCell: ({ row }: RenderCellProps<GridRow>) => (
        <div style={cellDivStyle(index)}>{String(row[header] ?? '')}</div>
      ),
    }))

    return [rowNumberColumn, ...editableColumns]
  }, [
    headers,
    colWidths,
    displayColCount,
    handleRowResizePointerDown,
    handleRowResizePointerMove,
    endRowResize,
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
    if (args.column.key === ROW_NUMBER_KEY) {
      return
    }

    if (event.detail === 1) {
      args.selectCell(true)
    }
  }

  if (headers.length === 0) {
    return <p>No table data found.</p>
  }

  return (
    <div className="spec-editor-viewport">
      <DataGrid
        columns={columns}
        rows={gridRows}
        rowKeyGetter={(row) => row.__rowNumber}
        columnWidths={rdgColumnWidths}
        onColumnWidthsChange={handleColumnWidthsChange}
        rowHeight={rowHeightForRow}
        headerRowHeight={DEFAULT_HEIGHT}
        onRowsChange={handleRowsChange}
        onCellClick={handleCellClick}
        onScroll={handleGridScroll}
        enableVirtualization
        className="fill-grid"
        style={{ width: '100%', height: '100%', maxWidth: '100%', boxSizing: 'border-box' }}
      />
    </div>
  )
}
