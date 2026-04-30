import { remark } from 'remark'
import remarkGfm from 'remark-gfm'
import type { Root, Table, TableCell, TableRow } from 'mdast'

export type ParsedSpecRow = Record<string, string>

export const SAMPLE_SPEC_MARKDOWN = `
| id | feature | test_case | expected |
| --- | --- | --- | --- |
| TC-001 | Login | Valid credentials | User can sign in |
| TC-002 | Login | Invalid password | Error message is shown |
| TC-003 | Password Reset | Valid email | Reset mail is sent |
`.trim()

function findFirstTable(node: Root): Table | null {
  const stack: unknown[] = [node]

  while (stack.length > 0) {
    const current = stack.pop() as { type?: string; children?: unknown[] } | undefined
    if (!current) {
      continue
    }

    if (current.type === 'table') {
      return current as Table
    }

    if (Array.isArray(current.children)) {
      for (let i = current.children.length - 1; i >= 0; i -= 1) {
        stack.push(current.children[i])
      }
    }
  }

  return null
}

function textFromNode(node: unknown): string {
  const current = node as {
    value?: string
    children?: unknown[]
  }

  if (typeof current?.value === 'string') {
    return current.value
  }

  if (Array.isArray(current?.children)) {
    return current.children.map(textFromNode).join('')
  }

  return ''
}

function rowToCells(row: TableRow): string[] {
  return row.children.map((cell: TableCell) => textFromNode(cell).trim())
}

export function parseMarkdownTableToJson(markdown: string): ParsedSpecRow[] {
  const tree = remark().use(remarkGfm).parse(markdown) as Root
  const table = findFirstTable(tree)

  if (!table || table.children.length === 0) {
    return []
  }

  const [headerRow, ...dataRows] = table.children
  const headers = rowToCells(headerRow).filter((header) => header.length > 0)
  if (headers.length === 0) {
    return []
  }

  return dataRows.map((row) => {
    const cells = rowToCells(row)
    const record: ParsedSpecRow = {}

    headers.forEach((header, index) => {
      record[header] = cells[index] ?? ''
    })

    return record
  })
}

function escapeMarkdownCell(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ')
}

function toCellValue(value: unknown): string {
  if (value === null || value === undefined) {
    return ''
  }
  return String(value)
}

export function stringifyJsonToMarkdownTable(rows: ParsedSpecRow[]): string {
  if (rows.length === 0) {
    return ''
  }

  const headers = Object.keys(rows[0])
  if (headers.length === 0) {
    return ''
  }

  const headerLine = `| ${headers.map(escapeMarkdownCell).join(' | ')} |`
  const separatorLine = `| ${headers.map(() => '---').join(' | ')} |`
  const dataLines = rows.map((row) => {
    const cells = headers.map((header) => escapeMarkdownCell(toCellValue(row[header])))
    return `| ${cells.join(' | ')} |`
  })

  return [headerLine, separatorLine, ...dataLines].join('\n')
}
