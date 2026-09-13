import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('ゲーム開始時に説明のモーダルを出し、OKで閉じる', async () => {
  const [screen, store] = await Promise.all([
    read('../src/screens/GamePage.tsx'),
    read('../src/game/store.ts'),
  ]);

  assert.match(screen, /function IntroModal/);
  assert.match(screen, /aria-modal="true"/);
  assert.match(screen, /OK、はじめる/);
  assert.match(store, /showIntro: true/);
  assert.match(store, /closeIntro/);
});

test('盤面の見出しをなくし、色の違うマスにタップ・ホバーで説明を出す', async () => {
  const [screen, styles] = await Promise.all([
    read('../src/screens/GamePage.tsx'),
    read('../src/styles.css'),
  ]);

  assert.doesNotMatch(screen, /THE ROAD/);
  assert.match(screen, /className="space-tip"/);
  assert.match(screen, /SUPER ITEMマス/);
  assert.match(styles, /\.has-tip:hover\s+\.space-tip/);
  assert.match(styles, /\.board-scroll\s*{[^}]*overflow:\s*visible/);
});

test('先手・後手はサイコロで決め、目が大きい人が選ぶ', async () => {
  const [screen, store] = await Promise.all([
    read('../src/screens/GamePage.tsx'),
    read('../src/game/store.ts'),
  ]);

  assert.match(screen, /function TurnOrderPanel/);
  assert.match(screen, /先手にする/);
  assert.match(screen, /後手にする/);
  assert.match(store, /createOrderGame/);
  assert.match(store, /rollForOrder/);
  assert.match(store, /chooseTurnOrder/);
});
