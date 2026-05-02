import { describe, expect, it } from 'vitest'
import { cellMapToYellowtailRows, makeCellKey } from './cell-map'

describe('cellMapToYellowtailRows', () => {
  it('omit rows where every cell is empty', () => {
    const headers = ['a', 'b']
    const data = new Map<string, string>()
    data.set(makeCellKey(0, 0), 'top')
    data.set(makeCellKey(5, 1), 'deep')
    const rows = cellMapToYellowtailRows(data, headers)
    expect(rows).toHaveLength(2)
    expect(rows[0]).toEqual({ a: 'top', b: '' })
    expect(rows[1]).toEqual({ a: '', b: 'deep' })
  })

  it('returns empty array when map has no in-range keys', () => {
    const headers = ['a']
    expect(cellMapToYellowtailRows(new Map(), headers)).toEqual([])
  })
})
