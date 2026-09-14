import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('対戦が終わったら「もう一回」か、部屋の解散（この端末では終了）を選ぶ', async () => {
  const [screen, store, client] = await Promise.all([
    read('../src/screens/GamePage.tsx'),
    read('../src/game/store.ts'),
    read('../src/online/roomClient.ts'),
  ]);

  assert.match(screen, /もう一回/);
  assert.match(screen, /部屋を解散する/);
  assert.match(screen, /終わる/);
  assert.match(store, /dissolveRoom/);
  assert.match(store, /isClosed\(room\)/);
  assert.match(client, /op: "close"/);
});

test('サイコロは自分で振って止め、数字が回ってから止まる', async () => {
  const [screen, styles] = await Promise.all([
    read('../src/screens/GamePage.tsx'),
    read('../src/styles.css'),
  ]);

  assert.match(screen, /function RollAction/);
  assert.match(screen, /"止める"/);
  assert.match(screen, /function useSpinningFace/);
  assert.match(screen, /function useRevealAfter/);
  assert.match(styles, /@keyframes dice-wobble/);
});

test('7は大きく表示して画面を揺らし、3は別の演出を出す', async () => {
  const [screen, styles] = await Promise.all([
    read('../src/screens/GamePage.tsx'),
    read('../src/styles.css'),
  ]);

  assert.match(screen, /function useRollCelebration/);
  // エクスクラメーションは半角
  assert.match(screen, /"7!!"/);
  assert.match(screen, /"3!"/);
  assert.doesNotMatch(screen, /7！！|3！"/);
  assert.match(styles, /\.celebration\s*{[^}]*pointer-events:\s*none/);
  assert.match(styles, /@keyframes screen-shake/);
  assert.match(styles, /@keyframes three-ring/);
});
