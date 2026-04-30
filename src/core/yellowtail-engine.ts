import type { SpecRow } from './models/spec-table'

export type YellowtailRow = SpecRow

function normalizeLines(markdown: string): string[] {
  return markdown
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
}

function isTableLine(line: string): boolean {
  return line.startsWith('|')
}

function isSeparatorLine(line: string): boolean {
  const cells = splitMarkdownRow(line)
  if (cells.length === 0) {
    return false
  }

  return cells.every((cell) => /^:?-{3,}:?$/.test(cell.trim()))
}

function splitMarkdownRow(line: string): string[] {
  const trimmed = line.trim()
  if (!trimmed.startsWith('|')) {
    return []
  }

  const core = trimmed.endsWith('|') ? trimmed.slice(1, -1) : trimmed.slice(1)
  const cells: string[] = []
  let current = ''
  let escaped = false

  for (let i = 0; i < core.length; i += 1) {
    const ch = core[i]
    if (escaped) {
      current += ch
      escaped = false
      continue
    }

    if (ch === '\\') {
      escaped = true
      continue
    }

    if (ch === '|') {
      cells.push(current.trim())
      current = ''
      continue
    }

    current += ch
  }

  if (escaped) {
    current += '\\'
  }
  cells.push(current.trim())

  return cells
}

function escapeCell(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ')
}

export function parseMarkdownTableToJson(markdown: string): YellowtailRow[] {
  const lines = normalizeLines(markdown)
  if (lines.length < 2) {
    return []
  }

  const firstTableLineIndex = lines.findIndex(isTableLine)
  if (firstTableLineIndex < 0 || firstTableLineIndex + 1 >= lines.length) {
    return []
  }

  const headerLine = lines[firstTableLineIndex]
  const separatorLine = lines[firstTableLineIndex + 1]
  if (!isSeparatorLine(separatorLine)) {
    return []
  }

  const headers = splitMarkdownRow(headerLine).map((header) => header.trim())
  if (headers.length === 0 || headers.some((header) => header.length === 0)) {
    return []
  }

  const rows: YellowtailRow[] = []
  for (let i = firstTableLineIndex + 2; i < lines.length; i += 1) {
    const line = lines[i]
    if (!isTableLine(line)) {
      break
    }

    const cells = splitMarkdownRow(line)
    const row: YellowtailRow = {}
    for (let col = 0; col < headers.length; col += 1) {
      row[headers[col]] = cells[col] ?? ''
    }
    rows.push(row)
  }

  return rows
}

export function stringifyJsonToMarkdownTable(rows: YellowtailRow[]): string {
  if (rows.length === 0) {
    return ''
  }

  const headers = Object.keys(rows[0])
  if (headers.length === 0) {
    return ''
  }

  const headerLine = `| ${headers.map(escapeCell).join(' | ')} |`
  const separatorLine = `| ${headers.map(() => '---').join(' | ')} |`
  const dataLines = rows.map((row) => {
    const cells = headers.map((header) => escapeCell(String(row[header] ?? '')))
    return `| ${cells.join(' | ')} |`
  })

  return [headerLine, separatorLine, ...dataLines].join('\n')
}
