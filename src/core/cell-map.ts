import type { YellowtailRow } from './yellowtail-engine'

/** Initial rows/cols before user scrolls to expand (spreadsheet-style growth). */
export const INITIAL_GRID_ROWS = 100
export const INITIAL_GRID_COLS = 20

/** How many rows/cols to append when scrolling near the bottom/right edge. */
export const GRID_EXPAND_ROW_CHUNK = 50
export const GRID_EXPAND_COL_CHUNK = 10

/** Distance from scroll edge (px) that triggers expansion. */
export const GRID_EXPAND_EDGE_PX = 72

/** @deprecated Use INITIAL_GRID_ROWS */
export const SPEC_GRID_DISPLAY_ROWS = INITIAL_GRID_ROWS
/** @deprecated Use INITIAL_GRID_COLS */
export const SPEC_GRID_DISPLAY_COLS = INITIAL_GRID_COLS

/** Default pixel size when `colWidths` / `rowHeights` has no entry for that index. */
export const DEFAULT_WIDTH = 100
export const DEFAULT_HEIGHT = 25

/** Minimum row height when dragging row boundaries (px). */
export const MIN_ROW_HEIGHT = 18

/**
 * Key for the row-header column (`#`) inside `colWidths`. Data columns use `0..(columnCount-1)`.
 */
export const GRID_ROW_HEADER_COL_KEY = -1

/** Parse sparse keys to infer max row/col indices (for sizing grid after load). */
export function inferExtentsFromCellMap(data: Map<string, string>): {
  maxRow: number
  maxCol: number
} {
  let maxRow = -1
  let maxCol = -1
  for (const key of data.keys()) {
    const sep = key.indexOf('-')
    if (sep <= 0) continue
    const r = Number(key.slice(0, sep))
    const c = Number(key.slice(sep + 1))
    if (!Number.isInteger(r) || !Number.isInteger(c)) continue
    maxRow = Math.max(maxRow, r)
    maxCol = Math.max(maxCol, c)
  }
  return { maxRow, maxCol }
}

export function makeCellKey(row: number, col: number): string {
  return `${row}-${col}`
}

export function padColumnHeaders(existing: string[], displayCols: number): string[] {
  const out = existing.slice(0, displayCols)
  while (out.length < displayCols) {
    out.push(`col_${out.length}`)
  }
  return out
}

export function yellowtailRowsToCellMap(
  rows: YellowtailRow[],
  headers: string[],
): Map<string, string> {
  const map = new Map<string, string>()
  for (let r = 0; r < rows.length; r += 1) {
    const row = rows[r]
    for (let c = 0; c < headers.length; c += 1) {
      const value = String(row[headers[c]] ?? '')
      if (value !== '') {
        map.set(makeCellKey(r, c), value)
      }
    }
  }
  return map
}

export function cellMapToYellowtailRows(
  data: Map<string, string>,
  headers: string[],
): YellowtailRow[] {
  if (data.size === 0) {
    return []
  }

  let maxRow = -1
  for (const key of data.keys()) {
    const idx = key.indexOf('-')
    if (idx <= 0) {
      continue
    }
    const r = Number(key.slice(0, idx))
    const c = Number(key.slice(idx + 1))
    if (!Number.isInteger(r) || !Number.isInteger(c) || c < 0 || c >= headers.length) {
      continue
    }
    maxRow = Math.max(maxRow, r)
  }

  if (maxRow < 0) {
    return []
  }

  const rows: YellowtailRow[] = []
  for (let r = 0; r <= maxRow; r += 1) {
    const row: YellowtailRow = {}
    let hasContent = false
    for (let c = 0; c < headers.length; c += 1) {
      const value = data.get(makeCellKey(r, c)) ?? ''
      row[headers[c]] = value
      if (String(value).trim() !== '') {
        hasContent = true
      }
    }
    if (hasContent) {
      rows.push(row)
    }
  }
  return rows
}
