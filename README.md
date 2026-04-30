# Yellowtail (WIP)

Excelベースのソフトウェア仕様書管理を楽にしたい。

## 🚀 Concept
現場（SES/SIer）で蔓延する「バイナリ形式の仕様書管理（Excel/Word）」による、SVNやフォルダ管理でのコンフリクトや差分確認の困難さを解決するためのデスクトップツールです。

- **Git/SVN Friendly**: 実体はMarkdown（.spec）として保存し、差分を可視化。
- **High Performance**: 疎行列（Sparse Matrix）データ構造により、巨大な仕様書も軽量に動作。
- **Universal Architecture**: コアロジックをUIから完全に分離し、Tauri/VS Code Extensionなど多展開を想定。

## 🛠️ Tech Stack
- **Frontend**: React, TypeScript, Tailwind CSS
- **Desktop Engine**: Tauri (Rust)
- **Data Structure**: Sparse Matrix (Core TS)

## 📅 Roadmap
- [ ] Core Engine: 疎行列データ構造の実装
- [ ] Parser: Markdown ↔ JSON 相互変換
- [ ] UI: 無限スクロール対応の仕様書エディタ
- [ ] Integration: SVN/Git コンフリクト解消支援機能



# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
