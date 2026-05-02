import './App.css'
import { SpecEditor } from './components/SpecEditor'
import { stringifyJsonToMarkdownTable, type YellowtailRow } from './core/yellowtail-engine'

type AppProps = {
  columnHeaders: string[]
  cellData: Map<string, string>
  colWidths: Map<number, number>
  rowHeights: Map<number, number>
  rowsForExport: YellowtailRow[]
  saveMessage: string
  storageEnvironment: string
  onCellDataChange: (next: Map<string, string>) => void
  onColWidthsChange: (next: Map<number, number>) => void
  onRowHeightChange: (rowIndex: number, heightPx: number) => void
  onSave: () => void
}

function App({
  columnHeaders,
  cellData,
  colWidths,
  rowHeights,
  rowsForExport,
  saveMessage,
  storageEnvironment,
  onCellDataChange,
  onColWidthsChange,
  onRowHeightChange,
  onSave,
}: AppProps) {
  return (
    <main style={{ padding: '24px', display: 'grid', gap: '16px' }}>
      <h1>Yellowtail Spec Editor</h1>
      <p>
        UIは表示に専念し、保存はアダプタ層を経由します（現在: {storageEnvironment}）。
      </p>

      <div style={{ height: 480 }}>
        <SpecEditor
          columnHeaders={columnHeaders}
          data={cellData}
          colWidths={colWidths}
          rowHeights={rowHeights}
          onCellDataChange={onCellDataChange}
          onColWidthsChange={onColWidthsChange}
          onRowHeightChange={onRowHeightChange}
        />
      </div>

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
    </main>
  )
}

export default App
