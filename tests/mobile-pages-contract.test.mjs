import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('GitHub Pages配下で直接開けるHash RouterとVite baseを使う', async () => {
  const [router, vite] = await Promise.all([
    read('../src/router.tsx'),
    read('../vite.config.ts'),
  ]);

  assert.match(router, /createHashHistory/);
  assert.match(router, /history:\s*createHashHistory\(\)/);
  assert.match(vite, /base:\s*['"]\/minami-survivor\/['"]/);
});

test('スマホを基本レイアウトとし、広い画面だけmin-widthで拡張する', async () => {
  const [screen, styles, html] = await Promise.all([
    read('../src/screens/GamePage.tsx'),
    read('../src/styles.css'),
    read('../index.html'),
  ]);

  assert.match(html, /width=device-width, initial-scale=1, viewport-fit=cover/);
  assert.match(screen, /className="match-layout"/);
  assert.match(screen, /className="opponent-row player-strip"/);
  assert.match(screen, /className="self-row player-strip"/);
  assert.match(styles, /grid-template-areas:\s*"opponent"\s*"board"\s*"self"\s*"action"\s*"log"/);
  assert.match(styles, /@media \(min-width: 901px\)/);
  assert.doesNotMatch(styles, /@media \(max-width:/);
});

test('対戦画面は連鎖結果を明示し、スマホ盤面を横スクロール不要にする', async () => {
  const [screen, styles] = await Promise.all([
    read('../src/screens/GamePage.tsx'),
    read('../src/styles.css'),
  ]);

  assert.match(screen, /連チャン/);
  assert.match(screen, /追加ロール/);
  assert.match(screen, /順位ボーナス/);
  assert.match(screen, /chain-result/);
  assert.match(screen, /MATCH LOG/);
  assert.match(styles, /\.opponent-row\s*{[^}]*grid-area:\s*opponent/s);
  assert.match(styles, /\.self-row\s*{[^}]*grid-area:\s*self/s);
  assert.match(styles, /\.board-grid\s*{[^}]*grid-template-columns:\s*repeat\(15,\s*minmax\(0,\s*1fr\)\)/s);
  assert.doesNotMatch(styles, /\.board-grid\s*{[^}]*min-width:\s*690px/s);
  assert.match(styles, /@media \(max-height:\s*700px\)/);
});

test('手番終了と連鎖確定は明示ボタンで行い、全イベントに動きを与える', async () => {
  const [screen, store, styles] = await Promise.all([
    read('../src/screens/GamePage.tsx'),
    read('../src/game/store.ts'),
    read('../src/styles.css'),
  ]);

  assert.match(screen, /番を終わる/);
  assert.match(screen, /ここまでを確定して進む/);
  assert.match(store, /endTurn/);
  assert.match(store, /resolveChain/);
  assert.match(store, /advanceMovement/);
  assert.match(store, /setTimeout/);
  assert.match(screen, /event-stage/);
  assert.match(screen, /player\.id}-\${player\.position/);
  assert.match(styles, /@keyframes event-arrive/);
  assert.match(styles, /@keyframes token-arrive/);
  assert.match(styles, /@keyframes dice-arrive/);
  assert.match(styles, /prefers-reduced-motion[\s\S]*animation:\s*none\s*!important/);
});

test('アイテムはタップ・ホバー・フォーカスで説明を確認してから選べる', async () => {
  const [screen, styles] = await Promise.all([
    read('../src/screens/GamePage.tsx'),
    read('../src/styles.css'),
  ]);

  assert.match(screen, /function ItemDescription/);
  assert.match(screen, /className="item-inspector"/);
  assert.match(screen, /className="item-choice"/);
  assert.match(screen, /このアイテムを選ぶ/);
  assert.match(screen, /通常：/);
  assert.match(screen, /SUPER：/);
  assert.match(styles, /\.item-inspector:hover\s+\.item-description/);
  assert.match(styles, /\.item-choice:hover\s+\.item-choice-popover/);
  assert.match(styles, /:focus-within/);
});

test('合計3の強化と同マス交換は確認ボタンで任意選択する', async () => {
  const [screen, store, rules] = await Promise.all([
    read('../src/screens/GamePage.tsx'),
    read('../src/game/store.ts'),
    read('../src/screens/RulesPage.tsx'),
  ]);

  assert.match(screen, /SUPER化する/);
  assert.match(screen, /そのまま進む/);
  assert.match(screen, /交換する/);
  assert.match(screen, /交換しない/);
  assert.match(store, /acceptItemUpgrade/);
  assert.match(store, /declineItemUpgrade/);
  assert.match(store, /acceptItemExchange/);
  assert.match(store, /declineItemExchange/);
  assert.match(rules, /選択後に3マス進みます/);
  assert.match(rules, /交換するか選べます/);
});

test('GitHub Actionsがゲームだけを検証・ビルドしてPagesへ公開する', async () => {
  const workflow = await read('../.github/workflows/deploy-pages.yml');

  assert.match(workflow, /run:\s*npm ci/);
  assert.match(workflow, /run:\s*npm test/);
  assert.match(workflow, /run:\s*npm run build/);
  assert.match(workflow, /path:\s*dist/);
  assert.match(workflow, /actions\/deploy-pages@v4/);
});
