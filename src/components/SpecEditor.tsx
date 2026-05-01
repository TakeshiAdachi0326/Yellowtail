import { type MouseEvent, useMemo } from 'react'
import { DataGrid, renderTextEditor, type CellMouseArgs, type Column } from 'react-data-grid'
import type { YellowtailRow } from '../core/yellowtail-engine'
import {
  SPEC_GRID_DISPLAY_COLS,
  SPEC_GRID_DISPLAY_ROWS,
  makeCellKey,
} from '../core/cell-map'

type SpecEditorProps = {
  columnHeaders: string[]
  data: Map<string, string>
  onCellDataChange?: (next: Map<string, string>) => void
}

type GridRow = YellowtailRow & { __rowNumber: string }

/** Fixed grid size for sparse rendering (not derived from data length). */
const displayRows = SPEC_GRID_DISPLAY_ROWS
const displayCols = SPEC_GRID_DISPLAY_COLS

function toExcelColumnName(index: number): string {
  let current = index
  let result = ''

  while (current >= 0) {
    result = String.fromCharCode((current % 26) + 65) + result
    current = Math.floor(current / 26) - 1
  }

  return result
}

export function SpecEditor({ columnHeaders, data, onCellDataChange }: SpecEditorProps) {
  const headers = columnHeaders

  const columns = useMemo<Column<GridRow>[]>(() => {
    const rowNumberColumn: Column<GridRow> = {
      key: '__rowNumber',
      name: '#',
      width: 60,
      editable: false,
      resizable: false,
      frozen: true,
    }

    const editableColumns = headers.slice(0, displayCols).map((header, index) => ({
      key: header,
      name: toExcelColumnName(index),
      editable: true,
      resizable: true,
      renderEditCell: renderTextEditor,
    }))

    return [rowNumberColumn, ...editableColumns]
  }, [headers])

  const gridRows = useMemo<GridRow[]>(() => {
    const rows: GridRow[] = []
    const effectiveHeaders = headers.slice(0, displayCols)

    for (let r = 0; r < displayRows; r += 1) {
      const row: GridRow = { __rowNumber: String(r + 1) }
      for (let c = 0; c < effectiveHeaders.length; c += 1) {
        const key = effectiveHeaders[c]
        row[key] = data.get(makeCellKey(r, c)) ?? ''
      }
      rows.push(row)
    }

    return rows
  }, [data, headers])

  const handleRowsChange = (nextRows: GridRow[]) => {
    const next = new Map(data)
    const effectiveHeaders = headers.slice(0, displayCols)

    for (let r = 0; r < displayRows; r += 1) {
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

  const handleCellClick = (args: CellMouseArgs<GridRow>, event: MouseEvent) => {
    if (args.column.key === '__rowNumber') {
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
    <DataGrid
      columns={columns}
      rows={gridRows}
      onRowsChange={handleRowsChange}
      onCellClick={handleCellClick}
      className="fill-grid"
    />
  )
}
