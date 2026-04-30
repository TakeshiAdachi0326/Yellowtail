export type SpecRow = Record<string, string>

function splitMarkdownRow(row: string): string[] {
  return row
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim())
}

function isSeparatorRow(row: string): boolean {
  const cells = splitMarkdownRow(row)
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell))
}

export function parseSpecMarkdownTable(markdown: string): SpecRow[] {
  const tableLines = markdown
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('|') && line.includes('|'))

  if (tableLines.length < 2) {
    console.warn('[specParser] Markdown table was not found or is incomplete.')
    return []
  }

  const headers = splitMarkdownRow(tableLines[0]).filter((header) => header.length > 0)
  if (headers.length === 0) {
    console.warn('[specParser] Header row is empty.')
    return []
  }

  const dataStartIndex = isSeparatorRow(tableLines[1]) ? 2 : 1
  const rows: SpecRow[] = []

  for (let i = dataStartIndex; i < tableLines.length; i += 1) {
    const cells = splitMarkdownRow(tableLines[i])
    if (cells.every((cell) => cell.length === 0)) {
      continue
    }

    if (cells.length !== headers.length) {
      console.warn(
        `[specParser] Column length mismatch at row ${i + 1}. expected=${headers.length}, actual=${cells.length}`,
      )
    }

    const row: SpecRow = {}
    headers.forEach((header, index) => {
      row[header] = cells[index] ?? ''
    })
    rows.push(row)
  }

  return rows
}
