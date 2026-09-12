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

test('GitHub Actionsがゲームだけを検証・ビルドしてPagesへ公開する', async () => {
  const workflow = await read('../.github/workflows/deploy-pages.yml');

  assert.match(workflow, /run:\s*npm ci/);
  assert.match(workflow, /run:\s*npm test/);
  assert.match(workflow, /run:\s*npm run build/);
  assert.match(workflow, /path:\s*dist/);
  assert.match(workflow, /actions\/deploy-pages@v4/);
});
