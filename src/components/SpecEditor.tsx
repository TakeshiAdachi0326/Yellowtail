import { type MouseEvent, useMemo } from 'react'
import { DataGrid, renderTextEditor, type CellMouseArgs, type Column } from 'react-data-grid'
import type { YellowtailRow } from '../core/yellowtail-engine'

type SpecEditorProps = {
  initialRows: YellowtailRow[]
  onRowsChange?: (rows: YellowtailRow[]) => void
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

export function SpecEditor({ initialRows, onRowsChange }: SpecEditorProps) {
  const rows = initialRows

  const headers = useMemo(() => Object.keys(rows[0] ?? {}), [rows])

  const columns = useMemo<Column<GridRow>[]>(() => {
    const rowNumberColumn: Column<GridRow> = {
      key: '__rowNumber',
      name: '#',
      width: 60,
      editable: false,
      resizable: false,
      frozen: true,
    }

    const headers = Object.keys(rows[0] ?? {})
    const editableColumns = headers.map((header, index) => ({
      key: header,
      name: toExcelColumnName(index),
      editable: true,
      resizable: true,
      renderEditCell: renderTextEditor,
    }))

    return [rowNumberColumn, ...editableColumns]
  }, [rows])

  const gridRows = useMemo<GridRow[]>(
    () => rows.map((row, index) => ({ ...row, __rowNumber: String(index + 1) })),
    [rows],
  )

  const handleRowsChange = (nextRows: GridRow[]) => {
    const normalizedRows = nextRows.map((row) => {
      const normalizedRow: YellowtailRow = {}
      headers.forEach((header) => {
        normalizedRow[header] = row[header] ?? ''
      })
      return normalizedRow
    })

    onRowsChange?.(normalizedRows)
  }

  const handleCellClick = (args: CellMouseArgs<GridRow>, event: MouseEvent) => {
    if (args.column.key === '__rowNumber') {
      return
    }

    if (event.detail === 1) {
      args.selectCell(true)
    }
  }

  if (columns.length === 0) {
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
