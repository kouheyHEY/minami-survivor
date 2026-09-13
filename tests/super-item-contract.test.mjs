import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('SUPERのアイテムは、スマホでも分かるように色とバッジで示す', async () => {
  const [screen, styles] = await Promise.all([
    read('../src/screens/GamePage.tsx'),
    read('../src/styles.css'),
  ]);

  assert.match(screen, /itemLevel === "super" \? "is-super" : ""/);
  assert.match(screen, /className="super-badge"/);
  assert.match(styles, /\.item-slot\.is-super\s*{[^}]*background:[^}]*var\(--lime\)/);
  assert.match(styles, /\.super-badge\s*{/);
  assert.doesNotMatch(styles, /\.super-badge\s*{[^}]*display:\s*none/);
  assert.match(styles, /@keyframes super-arrive/);
});
