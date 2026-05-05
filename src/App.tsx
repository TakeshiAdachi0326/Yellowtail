import './App.css'
import { SpecEditor } from './components/SpecEditor'
import { stringifyJsonToMarkdownTable, type YellowtailRow } from './core/yellowtail-engine'

type AppProps = {
  columnHeaders: string[]
  cellData: Map<string, string>
  displayRowCount: number
  displayColCount: number
  colWidths: Map<number, number>
  rowHeights: Map<number, number>
  rowsForExport: YellowtailRow[]
  saveMessage: string
  storageEnvironment: string
  onCellDataChange: (next: Map<string, string>) => void
  onColWidthsChange: (next: Map<number, number>) => void
  onExpandNearBottom: () => void
  onExpandNearRight: () => void
  /** 貼り付けなどで必要な表示行数・列数を確保（はみ出し分は拡張）。 */
  onEnsureDisplaySize: (minRows: number, minCols: number) => void
  onRowHeightChange: (rowIndex: number, heightPx: number) => void
  onSave: () => void
  undoRedo?: {
    canUndo: boolean
    canRedo: boolean
    undo: () => void
    redo: () => void
  }
}

function App({
  columnHeaders,
  cellData,
  displayRowCount,
  displayColCount,
  colWidths,
  rowHeights,
  rowsForExport,
  saveMessage,
  storageEnvironment,
  onCellDataChange,
  onColWidthsChange,
  onExpandNearBottom,
  onExpandNearRight,
  onEnsureDisplaySize,
  onRowHeightChange,
  onSave,
  undoRedo,
}: AppProps) {
  return (
    <main className="app-shell">
      <div className="app-shell__intro">
        <h1>Yellowtail Spec Editor</h1>
        <p>
          UIは表示に専念し、保存はアダプタ層を経由します（現在: {storageEnvironment}）。
        </p>
      </div>

      <div className="spec-grid-fixed-frame">
        <SpecEditor
          columnHeaders={columnHeaders}
          data={cellData}
          displayRowCount={displayRowCount}
          displayColCount={displayColCount}
          colWidths={colWidths}
          rowHeights={rowHeights}
          onCellDataChange={onCellDataChange}
          onColWidthsChange={onColWidthsChange}
          onExpandNearBottom={onExpandNearBottom}
          onExpandNearRight={onExpandNearRight}
          onEnsureDisplaySize={onEnsureDisplaySize}
          onRowHeightChange={onRowHeightChange}
          undoRedo={undoRedo}
        />
      </div>

      <div className="app-shell__meta">
        <section>
          <button type="button" onClick={onSave}>
            保存（StorageAdapter経由）
          </button>
          {saveMessage ? <p>{saveMessage}</p> : null}
        </section>

        <section>
          <h2>Sparse cell map (preview)</h2>
          <pre>{JSON.stringify(Object.fromEntries(cellData), null, 2)}</pre>
        </section>
        <section>
          <h2>JSON Preview (exported rows)</h2>
          <pre>{JSON.stringify(rowsForExport, null, 2)}</pre>
        </section>
        <section>
          <h2>Markdown Preview</h2>
          <pre>{stringifyJsonToMarkdownTable(rowsForExport)}</pre>
        </section>
      </div>
    </main>
  )
}

export default App
