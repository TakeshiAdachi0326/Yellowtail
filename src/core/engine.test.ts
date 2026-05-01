import { describe, expect, it } from 'vitest'
import { SparseMatrix } from './engine'

describe('SparseMatrix', () => {
  it('returns undefined for an empty cell', () => {
    const matrix = new SparseMatrix()
    expect(matrix.get(0, 0)).toBeUndefined()
  })

  it('stores and retrieves a value by row and column', () => {
    const matrix = new SparseMatrix()
    matrix.set(10000, 20, 'ok')

    expect(matrix.get(10000, 20)).toBe('ok')
  })

  it('removes a cell when set with empty value', () => {
    const matrix = new SparseMatrix()
    matrix.set(1, 1, 'value')
    matrix.set(1, 1, '')

    expect(matrix.get(1, 1)).toBeUndefined()
  })

  it('throws on negative row index', () => {
    const matrix = new SparseMatrix()

    expect(() => matrix.set(-1, 0, 'x')).toThrowError(
      'row index must be a non-negative integer: -1',
    )
  })

  it('throws on non-integer column index', () => {
    const matrix = new SparseMatrix()

    expect(() => matrix.get(0, 1.5)).toThrowError(
      'col index must be a non-negative integer: 1.5',
    )
  })
})
