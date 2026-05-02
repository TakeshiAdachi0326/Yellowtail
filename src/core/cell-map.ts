import type { YellowtailRow } from './yellowtail-engine'

/** Fixed viewport for sparse grid (Step 1). */
export const SPEC_GRID_DISPLAY_ROWS = 100
export const SPEC_GRID_DISPLAY_COLS = 20

/** Default pixel size when `colWidths` / `rowHeights` has no entry for that index. */
export const DEFAULT_WIDTH = 100
export const DEFAULT_HEIGHT = 25

/** Minimum row height when dragging row boundaries (px). */
export const MIN_ROW_HEIGHT = 18

/**
 * Key for the row-header column (`#`) inside `colWidths`. Data columns use `0..SPEC_GRID_DISPLAY_COLS - 1`.
 */
export const GRID_ROW_HEADER_COL_KEY = -1

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
    for (let c = 0; c < headers.length; c += 1) {
      row[headers[c]] = data.get(makeCellKey(r, c)) ?? ''
    }
    rows.push(row)
  }
  return rows
}
