import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createUseCase, validateUseCaseName } from './create-usecase.mjs';

async function workspace() {
  const root = await mkdtemp(path.join(tmpdir(), 'sysone-create-usecase-'));
  await writeFile(path.join(root, 'package.json'), JSON.stringify({ workspaces: ['packages/usecases/*'] }));
  await writeFile(path.join(root, 'tsconfig.base.json'), '{}');
  return root;
}

test('creates a complete isolated use-case workspace without editing infrastructure', async () => {
  const root = await workspace();
  const created = await createUseCase('flaky-test', root);
  assert.deepEqual(created.files.sort(), [
    'package.json',
    'src/index.ts',
    'tests/index.test.ts',
    'tsconfig.json',
  ]);
  const manifest = JSON.parse(await readFile(path.join(created.target, 'package.json'), 'utf8'));
  assert.equal(manifest.name, '@sysone/flaky-test');
  assert.equal(manifest.license, 'Apache-2.0');
  assert.equal(manifest.dependencies['@sysone/decision-core'], 'workspace:^');
});

test('scaffolds no README, because documentation follows boundaries rather than directories', async () => {
  const root = await workspace();
  const created = await createUseCase('risk-scoring', root);
  assert.ok(!created.files.includes('README.md'));
  assert.equal(existsSync(path.join(created.target, 'README.md')), false);
});

test('rejects invalid names and refuses to overwrite an existing use case', async () => {
  assert.throws(() => validateUseCaseName('Flaky Test'), /lowercase kebab-case/);
  const root = await workspace();
  await createUseCase('risk-routing', root);
  await assert.rejects(() => createUseCase('risk-routing', root), /already exists/);
});

test('a name collision leaves the existing package untouched', async () => {
  const root = await workspace();
  const created = await createUseCase('risk-routing', root);
  await writeFile(path.join(created.target, 'src', 'index.ts'), '// hand-written\n');
  await assert.rejects(() => createUseCase('risk-routing', root), /already exists/);
  // Rollback must never reach a package the generator did not create in this call.
  assert.equal(
    await readFile(path.join(created.target, 'src', 'index.ts'), 'utf8'),
    '// hand-written\n',
  );
});
