import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();
const PACKAGES = path.join(ROOT, 'packages');

async function files(directory, suffixes) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return files(target, suffixes);
    return suffixes.some((suffix) => entry.name.endsWith(suffix)) ? [target] : [];
  }));
  return nested.flat();
}

async function manifests(group) {
  const groupDirectory = path.join(PACKAGES, group);
  const entries = await readdir(groupDirectory, { withFileTypes: true });
  return Promise.all(entries.filter((entry) => entry.isDirectory()).map(async (entry) => {
    const file = path.join(groupDirectory, entry.name, 'package.json');
    return { file, json: JSON.parse(await readFile(file, 'utf8')) };
  }));
}

function workspaceRoot(file) {
  const relative = path.relative(PACKAGES, file).split(path.sep);
  return relative.length >= 3 ? path.join(PACKAGES, relative[0], relative[1]) : null;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

test('every workspace package declares the repository licence', async () => {
  const root = JSON.parse(await readFile(path.join(PACKAGES, '..', 'package.json'), 'utf8'));
  const all = [...await manifests('infra'), ...await manifests('providers'), ...await manifests('usecases')];
  assert.equal(root.license, 'Apache-2.0');
  for (const { file, json } of all) assert.equal(json.license, root.license, `${file} must declare ${root.license}`);
});

test('reusable packages never depend on or import an application', async () => {
  const applications = await manifests('usecases');
  const applicationNames = applications.map(({ json }) => json.name);
  const reusable = [...await manifests('infra'), ...await manifests('providers')];
  for (const { file, json } of reusable) {
    const dependencies = { ...json.dependencies, ...json.devDependencies, ...json.peerDependencies };
    for (const name of applicationNames) assert.equal(dependencies[name], undefined, `${file} depends on ${name}`);
  }

  const sourceFiles = [
    ...await files(path.join(PACKAGES, 'infra'), ['.ts', '.js', '.mjs', '.sh']),
    ...await files(path.join(PACKAGES, 'providers'), ['.ts', '.js', '.mjs', '.sh']),
  ];
  for (const file of sourceFiles) {
    const source = await readFile(file, 'utf8');
    for (const name of applicationNames) assert.doesNotMatch(source, new RegExp(escapeRegExp(name)), file);
  }
});

test('the orchestrator contains no use-case or concrete-provider assumptions', async () => {
  const script = await readFile(path.join(PACKAGES, 'infra/orchestrator/bin/start-services.sh'), 'utf8');
  assert.doesNotMatch(script, /playwright|USECASE|packages\/usecases|yarn lab|report-output|test-results|triage-output/i);

  const providers = await manifests('providers');
  for (const { json } of providers) {
    const providerName = String(json.name).replace(/^@sysone\/provider-/, '');
    assert.doesNotMatch(script, new RegExp(escapeRegExp(providerName), 'i'));
  }
});

test('cross-workspace source imports use package names, never relative traversal', async () => {
  const sourceFiles = await files(PACKAGES, ['.ts', '.tsx', '.js', '.mjs']);
  const importPattern = /(?:from\s+|import\s*\()(['"])(\.\.?\/[^'"]+)\1/g;
  for (const file of sourceFiles) {
    const owner = workspaceRoot(file);
    const source = await readFile(file, 'utf8');
    for (const match of source.matchAll(importPattern)) {
      const targetOwner = workspaceRoot(path.resolve(path.dirname(file), match[2]));
      assert.ok(!owner || !targetOwner || owner === targetOwner, `${file} crosses a workspace through ${match[2]}`);
    }
  }
});

test('persistence has no inferred provider identity', async () => {
  const schema = await readFile(path.join(PACKAGES, 'infra/decision-store/src/schema.ts'), 'utf8');
  const baseline = await readFile(path.join(PACKAGES, 'infra/decision-store/drizzle/0000_needy_starbolt.sql'), 'utf8');
  assert.doesNotMatch(schema, /DEFAULT_PROVIDER|DECISION_PROVIDER_IDS|decisions_provider_check/);
  assert.doesNotMatch(baseline, /provider" text DEFAULT|decisions_provider_check/);
});
