#!/usr/bin/env node
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SLUG = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

export function validateUseCaseName(name) {
  if (!name || !SLUG.test(name)) {
    throw new Error('Use-case name must be lowercase kebab-case, for example: flaky-test');
  }
}

export async function createUseCase(name, rootDirectory = process.cwd()) {
  validateUseCaseName(name);
  const rootManifest = JSON.parse(await readFile(path.join(rootDirectory, 'package.json'), 'utf8'));
  if (!Array.isArray(rootManifest.workspaces) || !rootManifest.workspaces.includes('packages/usecases/*')) {
    throw new Error('Run this command from the System One Lab workspace root.');
  }

  const target = path.join(rootDirectory, 'packages', 'usecases', name);
  await mkdir(path.dirname(target), { recursive: true });
  try {
    await mkdir(target, { recursive: false });
  } catch (error) {
    if (error && error.code === 'EEXIST') throw new Error(`Use case already exists: ${name}`, { cause: error });
    throw error;
  }

  const displayName = name.split('-').map((part) => part[0].toUpperCase() + part.slice(1)).join(' ');
  const files = {
    'src/index.ts': `export interface ${name.split('-').map((part) => part[0].toUpperCase() + part.slice(1)).join('')}UseCase {\n  readonly id: '${name}';\n}\n\nexport const useCase = { id: '${name}' } as const satisfies ${name.split('-').map((part) => part[0].toUpperCase() + part.slice(1)).join('')}UseCase;\n`,
    'tests/index.test.ts': `import assert from 'node:assert/strict';\nimport test from 'node:test';\nimport { useCase } from '../src/index.js';\n\ntest('${name} exposes its stable use-case id', () => {\n  assert.equal(useCase.id, '${name}');\n});\n`,
    'package.json': `${JSON.stringify({
      name: `@sysone/${name}`,
      version: '0.1.0',
      private: true,
      type: 'module',
      description: `System One use case: ${displayName}`,
      license: 'Apache-2.0',
      exports: { '.': './src/index.ts' },
      scripts: {
        typecheck: 'tsc --noEmit',
        test: 'tsx --test "tests/**/*.test.ts"',
        check: 'yarn typecheck && yarn test',
      },
      dependencies: {
        '@sysone/config': 'workspace:^',
        '@sysone/decision-core': 'workspace:^',
        '@sysone/decision-store': 'workspace:^',
      },
      devDependencies: { tsx: '4.23.15', typescript: '5.7.2' },
    }, null, 2)}\n`,
    'tsconfig.json': `${JSON.stringify({ extends: '../../../tsconfig.base.json', include: ['src', 'tests'] }, null, 2)}\n`,
  };

  // The directory now exists and is on the `packages/usecases/*` workspace glob,
  // so a half-written package would break `yarn check` for the whole repository.
  // Anything created here is therefore removed if any single write fails.
  try {
    for (const [relativePath, content] of Object.entries(files)) {
      const destination = path.join(target, relativePath);
      await mkdir(path.dirname(destination), { recursive: true });
      await writeFile(destination, content, { encoding: 'utf8', flag: 'wx' });
    }
  } catch (error) {
    await rm(target, { recursive: true, force: true });
    throw error;
  }

  return { name, target, files: Object.keys(files) };
}

const invokedAsCli = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (invokedAsCli) {
  const name = process.argv[2];
  try {
    const created = await createUseCase(name);
    console.log(`Created @sysone/${created.name} at ${path.relative(process.cwd(), created.target)}`);
    console.log(`Next: yarn install && yarn workspace @sysone/${created.name} check`);
    console.log(
      'Docs: packages/usecases/README.md already covers use-case anatomy and onboarding.\n' +
        '      Add a README here only once this use case owns something that document does not.',
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
