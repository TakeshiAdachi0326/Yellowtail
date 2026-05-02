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
  onRowHeightChange: (rowIndex: number, heightPx: number) => void
  onSave: () => void
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
  onRowHeightChange,
  onSave,
}: AppProps) {
  return (
    <main
      style={{
        padding: '24px',
        display: 'grid',
        gap: '16px',
        minWidth: 0,
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      <h1>Yellowtail Spec Editor</h1>
      <p>
        UIは表示に専念し、保存はアダプタ層を経由します（現在: {storageEnvironment}）。
      </p>

      <div
        style={{
          height: 480,
          width: '100%',
          maxWidth: '100%',
          minWidth: 0,
          boxSizing: 'border-box',
        }}
      >
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
