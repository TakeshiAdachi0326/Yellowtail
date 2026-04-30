export type SpecRow = Record<string, string>

export interface SpecTable {
  headers: string[]
  rows: SpecRow[]
}
