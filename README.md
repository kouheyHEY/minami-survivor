# みなみサバイバー

React、TanStack Router、TanStack Storeを基盤にした、1端末2人対戦の初期版です。

公開版: https://kouheyhey.github.io/synote/

## 起動

```sh
npm install
npm run dev
```

ローカルURLは `http://localhost:4174/synote/` です。画面はスマートフォンを基本に設計し、幅621px以上と901px以上で段階的に拡張します。

## 検証

```sh
npm test
npm run build
```

## 実装済み

- 2D6による移動
- 合計7の任意連鎖と失敗時-2マス
- 合計3のアイテム取得・SUPER化
- 10・25・45マス目のアイテム取得
- 同マス着地時のアイテム交換
- 3種類の通常/SUPERアイテム
- 後手の初期アイテムと初手振り直し
- 73マス以上への到達による勝利

オンライン部屋同期はこの初期版には含みません。ゲームルールはUIから独立した純粋関数として実装しており、後からサーバー同期層へ接続できます。

`main`ブランチのゲーム関連ファイルが更新されると、GitHub Actionsがテスト・ビルド後にGitHub Pagesへ自動公開します。
