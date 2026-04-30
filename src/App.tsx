import './App.css'
import { SpecEditor } from './components/SpecEditor'
import { stringifyJsonToMarkdownTable, type YellowtailRow } from './core/yellowtail-engine'

type AppProps = {
  rows: YellowtailRow[]
  saveMessage: string
  storageEnvironment: string
  onRowsChange: (nextRows: YellowtailRow[]) => void
  onSave: () => void
}

function App({ rows, saveMessage, storageEnvironment, onRowsChange, onSave }: AppProps) {
  return (
    <main style={{ padding: '24px', display: 'grid', gap: '16px' }}>
      <h1>Yellowtail Spec Editor</h1>
      <p>
        UIは表示に専念し、保存はアダプタ層を経由します（現在: {storageEnvironment}）。
      </p>

      <div style={{ height: 320 }}>
        <SpecEditor initialRows={rows} onRowsChange={onRowsChange} />
      </div>

      <section>
        <button type="button" onClick={onSave}>
          保存（StorageAdapter経由）
        </button>
        {saveMessage ? <p>{saveMessage}</p> : null}
      </section>

      <section>
        <h2>JSON Preview</h2>
        <pre>{JSON.stringify(rows, null, 2)}</pre>
      </section>
      <section>
        <h2>Markdown Preview</h2>
        <pre>{stringifyJsonToMarkdownTable(rows)}</pre>
      </section>
    </main>
  )
}

export default App
