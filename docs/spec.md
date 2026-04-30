# Project: Yellowtail
"Excel地獄から、QAエンジニアを解放する。"

## 1. プロジェクトの目的
QAエンジニアが現在直面している「Excelベースの仕様管理・テスト管理」の苦痛（差分が追えない、Box管理による先祖返り、重い動作）を、モダンな技術スタックで解決する。

## 2. コア・コンセプト
- **Docs as Code**: 仕様書はGitで管理し、差分を明確にする。
- **DB-less Architecture**: データベースを構築せず、ローカルのファイルシステム（Markdown/JSON）を正（Truth）とする。
- **Excel-like UI**: 編集体験はExcelのように直感的（react-data-grid）に行える。
- **独自拡張子 (.spec)**: 実体はMarkdownだが、本ツールで扱う専用の仕様ファイルとして定義する。

## 3. 技術スタック
- **Frontend**: React (TypeScript), Vite
- **UI Library**: react-data-grid (メインの編集グリッド)
- **Styling**: Tailwind CSS, Shadcn/ui (オプション)
- **Engine**: remark (Markdown Parser/Stringifier)
- **Protocol**: MCP (Model Context Protocol) 連携を想定した設計

## 4. 期待する動作フロー
1. ユーザーが `.spec` ファイル（Markdown）を読み込む。
2. 基幹エンジンがMarkdownの表（Table）を解析し、JSONに変換してメモリに保持。
3. `react-data-grid` がそのデータをExcelライクな表として表示。
4. ユーザーが画面上で編集・保存すると、再びMarkdown形式に変換してファイルに書き戻す。
5. Git（またはSVN）で変更差分を管理する。

## 5. AIへの指示（Agent Rules）
- **原則1：考えてから書く**。実装前に必ず設計を確認すること。
- **原則2：シンプルさが最優先**。オーバーエンジニアリングを避ける。
- **原則3：外科的な変更**。既存のコードを壊さず、最小限の修正を行う。
- **原則4：ゴール駆動**。QAエンジニアが「明日から現場で使えるか」を常に意識する。
- **原則5：機関部のUI非依存**。`src/core`（または engine 層）には React を含む UI 依存を持ち込まない。

コアロジックは、DOMやNode.js固有のAPIに依存させず、純粋なJavaScriptランタイム（ブラウザ環境、Node環境、Web Worker環境）のどこでも動く『Universal TypeScript』として実装せよ。
