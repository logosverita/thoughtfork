# ThoughtFork

AI会話を可視化・分岐管理するChrome拡張機能 - 思考の枝分かれを見失わない

## 概要

ThoughtForkは、Claude.aiでの会話を可視化し、会話の分岐を効率的に管理するためのChrome拡張機能です。複雑な会話の流れを直感的に把握し、重要なポイントにタグやメモを付けて整理できます。

## 機能

### 3つの表示モード

- **カンバンビュー**: 会話をカード形式で表示し、ブランチごとに整理
- **ネットワークビュー**: D3.jsを使用したグラフ表示で会話の構造を可視化
- **3Dビュー**: Three.jsによる立体的な会話マップ

### 会話管理機能

- **ブランチ管理**: 会話の分岐を作成・追跡
- **タグ付け**: メッセージに自由にタグを付けて分類
- **カラーカスタマイズ**: ブランチやメッセージに色を設定
- **フィルタリング**: タグ、ブランチ、キーワードで会話を絞り込み
- **メモ機能**: 各メッセージにメモを追加

## インストール

### 必要条件

- Node.js 18以上
- pnpm（推奨）またはnpm

### ビルド手順

```bash
# リポジトリをクローン
git clone https://github.com/logosverita/thoughtfork.git
cd thoughtfork

# 依存関係をインストール
pnpm install

# 開発モードでビルド（ファイル変更を監視）
pnpm dev

# 本番用ビルド
pnpm build
```

### Chrome拡張機能として読み込む

1. Chromeで `chrome://extensions` を開く
2. 右上の「デベロッパーモード」を有効にする
3. 「パッケージ化されていない拡張機能を読み込む」をクリック
4. `dist` フォルダを選択

## 使い方

1. Claude.ai（https://claude.ai）にアクセス
2. ブラウザのツールバーにあるThoughtForkアイコンをクリック
3. サイドパネルが開き、会話の可視化が表示されます
4. 表示モードを切り替えて、好みのビューで会話を確認

## 技術スタック

- **フロントエンド**: React 18, TypeScript
- **可視化**: D3.js, Three.js
- **スタイリング**: Tailwind CSS
- **ビルドツール**: Webpack
- **Chrome API**: Manifest V3, Side Panel API, Storage API

## プロジェクト構成

```
src/
├── background/       # Service Worker
├── content/          # コンテンツスクリプト（会話パーサー）
├── shared/           # 共通の型定義・ユーティリティ
├── sidepanel/        # サイドパネルUI
│   ├── components/   # Reactコンポーネント
│   │   ├── KanbanView.tsx
│   │   ├── NetworkView.tsx
│   │   ├── ThreeDView.tsx
│   │   └── ...
│   └── App.tsx
└── assets/           # アイコン等のアセット
```

## データ形式

ThoughtForkは独自のTOON形式でデータを管理します。

- **Conversation**: 1つの会話スレッド
- **Message**: 人間またはAIの1発言
- **Branch**: 会話の分岐
- **Tag**: メッセージの分類用タグ

詳細は `src/shared/types.ts` を参照してください。

## 開発

```bash
# 開発モード（ホットリロード）
pnpm dev

# ビルド
pnpm build

# クリーン
pnpm clean
```

## ライセンス

MIT License - 詳細は [LICENSE](LICENSE) ファイルを参照してください。

## 作者

ゆ
