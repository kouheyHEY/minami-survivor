import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('オンライン対戦は共通の game-server へ操作を送り、端末ではサイコロを振らない', async () => {
  const [store, client] = await Promise.all([
    read('../src/game/store.ts'),
    read('../src/online/roomClient.ts'),
  ]);

  assert.match(client, /functions\/v1\/game-rooms/);
  // 引用符の種類（' と "）はコード整形で変わるので、どちらでも通るようにする
  assert.match(client, /GAME_KEY = ["']minami-survivor["']/);
  assert.match(client, /["']room-updated["']/);
  assert.match(store, /if \(isOnline\(\)\) return void sendAction\(\{ type: ["']roll["'] \}\)/);
  assert.match(store, /if \(isOnline\(\)\) return void sendAction\(\{ type: ["']challenge["'] \}\)/);
  assert.match(store, /OFFLINE_POLL_MS/);
  // 先手・後手のサイコロが同時に届いて重なっても、押し直さずに済む
  assert.match(store, /action\.type !== ["']rollOrder["']/);
});

test('部屋をつくる・参加する・相手を待つ・相手の番を画面で分けて示す', async () => {
  const screen = await read('../src/screens/GamePage.tsx');

  assert.match(screen, /オンライン対戦/);
  assert.match(screen, /部屋をつくる/);
  assert.match(screen, /参加する/);
  assert.match(screen, /招待リンクを送る/);
  assert.match(screen, /相手を待っています/);
  assert.match(screen, /RIVAL TURN/);
  assert.match(screen, /function useDisplayedPositions/);
});
