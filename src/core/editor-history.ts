/**
 * エディタの差分履歴（案 B: パッチ蓄積）。
 *
 * ## 新しい操作を履歴に載せる手順
 * 1. このファイルに「状態のスナップショット型」と `diffX` / `applyX`（必要なら）を追加する。
 * 2. `EditorHistoryEntry` に optional フィールドを足す（1 コマンド = 1 エントリにまとめる）。
 * 3. `historyEntryIsEmpty` / `applyHistoryEntry` の分岐を 1 つ足す。
 * 4. `spec-editor-app.tsx` の該当ハンドラで `pushHistory({ ... })` を呼ぶ（初期状態は ref から diff）。
 *
 * ## 性能の目安（パッチ方式）
 * - 1 手あたり「変わったキー」だけなので、**数十〜100 手**でもメモリ・CPU は通常問題にならない。
 * - **数百手**でも多くのケースで実用範囲。セル Map が巨大で毎回数千キー変わる操作を繰り返すと負荷は上がる。
 * - **数千手以上**はスタック全体の Map オブジェクト数が増えるため、上限を付けるかスナップショット併用を検討。
 */

import { DEFAULT_HEIGHT, DEFAULT_WIDTH } from './cell-map'

/** セル Map のパッチ。`null` はキーを削除（空セル）。 */
export type CellMapPatch = Map<string, string | null>

/** 列幅・行高など数値スパース Map。`null` は「上書き削除＝既定値に戻す」。 */
export type NumMapPatch = Map<number, number | null>

/** グリッドの表示サイズとヘッダ（差分は小さく保つため行・列変更はスナップショット）。 */
export type GridLayoutSnapshot = {
  displayRowCount: number
  displayColCount: number
  columnHeaders: string[]
}

/** 1 回のユーザー操作に対応。含まれるフィールドだけが変化する。 */
export type EditorHistoryEntry = {
  cells?: { undo: CellMapPatch; redo: CellMapPatch }
  colWidths?: { undo: NumMapPatch; redo: NumMapPatch }
  rowHeights?: { undo: NumMapPatch; redo: NumMapPatch }
  gridLayout?: { undo: GridLayoutSnapshot; redo: GridLayoutSnapshot }
}

const normCell = (m: Map<string, string>, k: string) => m.get(k) ?? ''

/** `after` から `before` に戻すパッチと、その逆。 */
export function diffCellMaps(
  before: Map<string, string>,
  after: Map<string, string>,
): { undo: CellMapPatch; redo: CellMapPatch } {
  const undo: CellMapPatch = new Map()
  const redo: CellMapPatch = new Map()
  const keys = new Set([...before.keys(), ...after.keys()])
  for (const k of keys) {
    const b = normCell(before, k)
    const a = normCell(after, k)
    if (b === a) {
      continue
    }
    undo.set(k, b === '' ? null : b)
    redo.set(k, a === '' ? null : a)
  }
  return { undo, redo }
}

export function applyCellPatch(base: Map<string, string>, patch: CellMapPatch): Map<string, string> {
  const out = new Map(base)
  for (const [k, v] of patch) {
    if (v === null) {
      out.delete(k)
    } else {
      out.set(k, v)
    }
  }
  return out
}

export function patchIsEmpty(patch: CellMapPatch): boolean {
  return patch.size === 0
}

function effNum(m: Map<number, number>, k: number, defaultValue: number): number {
  return m.get(k) ?? defaultValue
}

export function diffSparseNumMaps(
  before: Map<number, number>,
  after: Map<number, number>,
  defaultValue: number,
): { undo: NumMapPatch; redo: NumMapPatch } {
  const undo: NumMapPatch = new Map()
  const redo: NumMapPatch = new Map()
  const keys = new Set([...before.keys(), ...after.keys()])
  for (const k of keys) {
    const b = effNum(before, k, defaultValue)
    const a = effNum(after, k, defaultValue)
    if (b === a) {
      continue
    }
    undo.set(k, before.has(k) ? before.get(k)! : null)
    redo.set(k, after.has(k) ? after.get(k)! : null)
  }
  return { undo, redo }
}

export function applyNumMapPatch(base: Map<number, number>, patch: NumMapPatch): Map<number, number> {
  const out = new Map(base)
  for (const [k, v] of patch) {
    if (v === null) {
      out.delete(k)
    } else {
      out.set(k, v)
    }
  }
  return out
}

export function numMapPatchIsEmpty(patch: NumMapPatch): boolean {
  return patch.size === 0
}

export function historyEntryIsEmpty(e: EditorHistoryEntry): boolean {
  if (e.cells && !patchIsEmpty(e.cells.undo)) {
    return false
  }
  if (e.colWidths && !numMapPatchIsEmpty(e.colWidths.undo)) {
    return false
  }
  if (e.rowHeights && !numMapPatchIsEmpty(e.rowHeights.undo)) {
    return false
  }
  if (e.gridLayout) {
    return false
  }
  return true
}

export type EditorHistoryStateSlice = {
  cellData: Map<string, string>
  colWidths: Map<number, number>
  rowHeights: Map<number, number>
}

export type EditorHistoryApplyResult = EditorHistoryStateSlice & {
  gridLayout?: GridLayoutSnapshot
}

/**
 * 現在状態に対し、履歴の undo または redo の一方を適用した結果を返す（React setState に渡す用）。
 */
export function applyHistoryEntry(
  entry: EditorHistoryEntry,
  direction: 'undo' | 'redo',
  current: EditorHistoryStateSlice & {
    gridRowCount: number
    gridColCount: number
    columnHeaders: string[]
  },
): EditorHistoryApplyResult {
  let cellData = current.cellData
  let colWidths = current.colWidths
  let rowHeights = current.rowHeights
  let gridLayout: GridLayoutSnapshot | undefined

  if (entry.cells) {
    const p = direction === 'undo' ? entry.cells.undo : entry.cells.redo
    cellData = applyCellPatch(cellData, p)
  }
  if (entry.colWidths) {
    const p = direction === 'undo' ? entry.colWidths.undo : entry.colWidths.redo
    colWidths = applyNumMapPatch(colWidths, p)
  }
  if (entry.rowHeights) {
    const p = direction === 'undo' ? entry.rowHeights.undo : entry.rowHeights.redo
    rowHeights = applyNumMapPatch(rowHeights, p)
  }
  if (entry.gridLayout) {
    gridLayout = direction === 'undo' ? entry.gridLayout.undo : entry.gridLayout.redo
  }

  return { cellData, colWidths, rowHeights, gridLayout }
}

/** 列幅用の既定値（表示計算と一致させる）。 */
export const COL_WIDTH_DEFAULT = DEFAULT_WIDTH

/** 行の高さの既定値。 */
export const ROW_HEIGHT_DEFAULT = DEFAULT_HEIGHT
