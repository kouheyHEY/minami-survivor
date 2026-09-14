import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('追加ロールは、振る前と確定前で同じ並びにしてレイアウトを動かさない', async () => {
  const screen = await read('../src/screens/GamePage.tsx');

  assert.match(screen, /function ChainPanel/);
  assert.match(screen, /game\.phase === "chain-choice" \|\|\s*game\.phase === "chain-resolution"\) && <ChainPanel/);
  assert.match(screen, /結果を確定して進む/);
  assert.match(screen, /ここまでを確定して進む/);
});

test('45マス目では、選ぶアイテムがSUPERだと見出し・カード・ボタンで分かる', async () => {
  const [screen, styles] = await Promise.all([
    read('../src/screens/GamePage.tsx'),
    read('../src/styles.css'),
  ]);

  assert.match(screen, /className="super-pill"/);
  assert.match(screen, /level === "super" && <em className="super-badge">SUPER<\/em>/);
  assert.match(screen, /`SUPER \$\{selectedMeta\.label\}`/);
  // 選んだあとにボタンが2行になって高さが変わらない
  assert.match(styles, /\.item-picker \.action-buttons button\s*{[^}]*white-space:\s*nowrap/);
  assert.match(styles, /\.item-picker\.is-super \.item-choice\s*{/);
  assert.match(styles, /\.super-pill\s*{[^}]*background:\s*var\(--lime\)/);
});
