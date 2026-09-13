# みなみサバイバー

React、TanStack Router、TanStack Storeを基盤にした第二版です。1台の端末で2人、またはオンラインで2人が対戦できます。

公開版: https://murinote.com/games/play/minami-survivor （MurikoNote に同梱）

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
- 合計3の移動前アイテム取得・任意SUPER化
- 10・25・45マス目の到達・通過によるアイテム取得（所持中は保持または交換）
- 主移動後に2位が選べる順位ボーナス+1マス
- 同マス着地時に選べるアイテム交換
- 3種類の通常/SUPERアイテム
- お互いの2D6で先手・後手を決め、目が大きい人が選択（同じ目は振り直し）
- 後手の初期通常チャームと初手振り直し
- ゲーム開始時の説明モーダル
- アイテム使用後も継続する手番
- 73マス以上への到達による勝利

## 効果音

`public/sounds/` の効果音は [イワシロ音楽素材](https://iwashiro-sounds.work/) のものです（クレジット表記が必要。遊び方ページに記載）。どの場面で鳴らすかは `src/screens/GamePage.tsx` の `useGameSounds`、ファイルとの対応は `src/audio/sound.ts` で決めています。画面右上の「音 ON / OFF」で切り替えられ、設定は端末に保存されます。

## オンライン対戦

共通サーバー [game-server](https://github.com/kouheyHEY/game-server)（Supabase）の Edge Function `game-rooms` を使います。このリポジトリにはサーバーの設定を置きません。

- 片方が「部屋をつくる」で6文字の部屋コードを作り、もう片方がそのコードか招待リンクで参加します。
- サイコロと判定はサーバーで行います。端末は操作を送り、返ってきた状態を表示します。
- 相手の操作は Realtime の通知で受け取ります。つながらない間は3秒ごとに取り直します。
- 席のトークンは端末に保存するので、読み込み直しても同じ席へ戻れます。

サーバーが使うルールは `src/game/online-rules.js` です。`engine.js` か `online-rules.js` を変えたら、game-server 側で次を実行して反映します。

```sh
node scripts/sync-rules.mjs
supabase functions deploy game-rooms --use-api
```

## 公開

公開先は MurikoNote（https://murinote.com 、リポジトリ MurikoHub、Netlify）です。GitHub Pages への自動公開は止めています（`.github/workflows/deploy-pages.yml` は手動実行のみ）。

```sh
# このリポジトリで、MurikoHub の同梱フォルダへビルドする
npx vite build --base=./ --outDir ../../03_アプリ開発/MurikoHub/public/games/MinamiSurvivor --emptyOutDir

# MurikoHub でコミット・push したあと、本番へデプロイする
cd ../../03_アプリ開発/MurikoHub
npm run build
npx netlify-cli deploy --prod --dir=dist --no-build
```
