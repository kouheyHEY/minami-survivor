# みなみサバイバー

React、TanStack Router、TanStack Storeを基盤にした、1端末2人対戦の第二版です。

公開版: https://kouheyhey.github.io/minami-survivor/

## 起動

```sh
npm install
npm run dev
```

ローカルURLは `http://localhost:4174/minami-survivor/` です。画面はスマートフォンを基本に設計し、幅621px以上と901px以上で段階的に拡張します。

## 検証

```sh
npm test
npm run build
```

## 実装済み

- 2D6による移動
- 合計7からの任意追加ロールと出目の累積移動
- 合計3のアイテム取得・SUPER化
- 10・25・45マス目の到達・通過によるアイテム取得（所持中は保持または交換）
- 主移動後に2位が選べる順位ボーナス+1マス
- 同マス着地時のアイテム交換
- 3種類の通常/SUPERアイテム
- 後手の初期通常チャームと初手振り直し
- アイテム使用後も継続する手番
- 73マス以上への到達による勝利

オンライン部屋同期はこの第二版には含みません。ゲームルールはUIから独立した純粋関数として実装しており、後からサーバー同期層へ接続できます。

`main`ブランチのゲーム関連ファイルが更新されると、GitHub Actionsがテスト・ビルド後にGitHub Pagesへ自動公開します。
