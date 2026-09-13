import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('出来事は画面に重ねず、操作パネルの上に高さを固定して表示する', async () => {
  const [screen, styles] = await Promise.all([
    read('../src/screens/GamePage.tsx'),
    read('../src/styles.css'),
  ]);

  assert.match(screen, /function EventFeed/);
  assert.match(screen, /className="action-area"/);
  assert.doesNotMatch(screen, /event-stage/);
  assert.match(styles, /\.event-feed\s*{[^}]*height:\s*42px/);
  assert.doesNotMatch(styles, /\.event-feed\s*{[^}]*position:\s*fixed/);
});

test('効果音は状態の変化で鳴らし、オン・オフを切り替えられる', async () => {
  const [screen, sound, router, rules] = await Promise.all([
    read('../src/screens/GamePage.tsx'),
    read('../src/audio/sound.ts'),
    read('../src/router.tsx'),
    read('../src/screens/RulesPage.tsx'),
  ]);

  assert.match(screen, /function useGameSounds/);
  assert.match(router, /className="sound-toggle"/);
  assert.match(sound, /イワシロ音楽素材/);
  assert.match(rules, /イワシロ音楽素材/);
  for (const file of ['dice', 'step', 'item', 'chain', 'danger', 'turn', 'my-turn', 'win']) {
    await access(new URL(`../public/sounds/${file}.mp3`, import.meta.url));
  }
});

test('部屋コードは全角や日本語入力の変換中でも崩れない', async () => {
  const [screen, client] = await Promise.all([
    read('../src/screens/GamePage.tsx'),
    read('../src/online/roomClient.ts'),
  ]);

  assert.match(client, /normalize\('NFKC'\)/);
  assert.match(screen, /isComposing/);
  assert.match(screen, /onCompositionEnd/);
});
