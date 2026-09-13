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
  assert.match(styles, /grid-template-areas:\s*"players"\s*"action"\s*"board"\s*"log"/);
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
  assert.match(styles, /\.players-row\s*{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/s);
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

test('GitHub Actionsがゲームだけを検証・ビルドしてPagesへ公開する', async () => {
  const workflow = await read('../.github/workflows/deploy-pages.yml');

  assert.match(workflow, /run:\s*npm ci/);
  assert.match(workflow, /run:\s*npm test/);
  assert.match(workflow, /run:\s*npm run build/);
  assert.match(workflow, /path:\s*dist/);
  assert.match(workflow, /actions\/deploy-pages@v4/);
});
