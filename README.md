# WanderMatch

WanderMatchは、検索条件を決めずに世界の観光地を眺め、気になる場所を端末内へ保存するWebアプリです。カードを左右へスワイプして観光地を振り分け、保存した場所を世界地図で確認できます。

現在は仕様書のPhase 5にあたる、7地域・200件の検証済みリリースデータを実装しています。地域配分、国・カテゴリの偏り、画像クレジット、地図クラスタリングをリリース条件として検証します。

## 主な機能

- Discover: ランダムデッキ、左右・上スワイプ、ボタン、キーボード操作
- 1ステップUndo: スキップ／保存を1件だけ取り消し、周回境界でも復元
- Map: 全件／お気に入り切替、クラスタ、ピン概要、Detail導線
- Detail: 東京からの代表アクセス、公式情報元、画像ごとの作者・ライセンス
- 端末内状態: `localStorage`、破損復旧、データ更新時のID移行、複数タブ同期
- プライバシー: ログイン、Cookie、解析、外部DB、位置情報取得なし

## 技術構成

- Next.js 16 App Router / React 19 / TypeScript
- Tailwind CSS 4 + CSSデザイントークン
- Leaflet + Leaflet.markercluster
- Vitest
- `pnpm`

React LeafletはHippocratic License 2.1の条件を避けるため採用せず、OSI承認ライセンスのLeafletをClient Componentから直接初期化しています。

## セットアップ

Node.js 24.xとpnpm 10.33.2を使用します。

```bash
pnpm install
pnpm dev
```

`http://localhost:3000` を開きます。

## 検証コマンド

```bash
pnpm validate:data
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

`pnpm build` は先にデータ検証を実行し、失敗したデータを公開しません。現在Playwrightは未導入です。導入後のE2Eでは `docs/specification.md` のモバイルスワイプ、PCドラッグ、地図、リセットダイアログ、スクリーンショット項目を確認してください。

## データ構成

観光地データは `data/spots/` の7地域JSONへ置きます。`data/dataset-manifest.json` の `datasetStage` は現在 `release` です。

- `sample`: manifestの件数・全7地域・型・URL・画像クレジット等を検証
- `release`: 上記に加え、合計200件と地域別 `30 / 50 / 30 / 30 / 20 / 20 / 20` を強制

国別6件以上を認める場合は、`data/country-limit-exceptions.json` へ理由と許可件数を明示する必要があります。

## プライバシーと外部通信

お気に入り、閲覧順、Undo情報はブラウザの `localStorage` だけに保存し、外部へ送信しません。`localStorage` が使えない場合は、そのタブを閉じるまでのメモリ状態で動作します。

画面表示時には次の外部通信が発生します。

- 観光地画像: `upload.wikimedia.org`
- 地図タイル: `tile.openstreetmap.org`

外部サービスには通常のHTTPリクエストとしてIPアドレスやリファラ等が伝わる場合があります。地図タイルは表示範囲だけを取得し、一括取得・オフライン保存・独自の再試行は行いません。

## ライセンス

このリポジトリ自身のコードライセンスは、現時点では指定していません。依存パッケージ、フォント、OpenStreetMap、各画像・データにはそれぞれのライセンスが適用されます。詳細は [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) と各Detailページの画像クレジットを参照してください。

## 仕様

完全な要件、データ型、受け入れ条件は [docs/specification.md](docs/specification.md) を参照してください。
