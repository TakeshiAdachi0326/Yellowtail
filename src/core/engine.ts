export type SparseCellValue = string

/**
 * Sparse matrix specialized for spreadsheet-like cell storage.
 * Only non-empty cells are stored to keep memory usage proportional
 * to populated cells instead of full sheet size.
 */
export class SparseMatrix {
  private readonly rows = new Map<number, Map<number, SparseCellValue>>()

  get(row: number, col: number): SparseCellValue | undefined {
    this.validateIndex(row, 'row')
    this.validateIndex(col, 'col')

    return this.rows.get(row)?.get(col)
  }

  set(row: number, col: number, value: SparseCellValue | undefined): void {
    this.validateIndex(row, 'row')
    this.validateIndex(col, 'col')

    const normalizedValue = value?.trim() ?? ''
    if (normalizedValue.length === 0) {
      this.deleteCell(row, col)
      return
    }

    let rowMap = this.rows.get(row)
    if (!rowMap) {
      rowMap = new Map<number, SparseCellValue>()
      this.rows.set(row, rowMap)
    }

    rowMap.set(col, normalizedValue)
  }

  private deleteCell(row: number, col: number): void {
    const rowMap = this.rows.get(row)
    if (!rowMap) {
      return
    }

    rowMap.delete(col)
    if (rowMap.size === 0) {
      this.rows.delete(row)
    }
  }

  private validateIndex(index: number, name: 'row' | 'col'): void {
    if (!Number.isInteger(index) || index < 0) {
      throw new Error(`${name} index must be a non-negative integer: ${index}`)
    }
  }
}
