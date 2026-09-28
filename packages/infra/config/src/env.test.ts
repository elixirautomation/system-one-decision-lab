import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, it } from 'node:test';
import { databaseUrl, DEFAULT_DATABASE_URL, loadLabEnv } from './env.js';

const PRESERVED = {
  DOTENV_CONFIG_PATH: process.env.DOTENV_CONFIG_PATH,
  DATABASE_URL: process.env.DATABASE_URL,
  BASE_URL: process.env.BASE_URL,
  ONLY_IN_FILE: process.env.ONLY_IN_FILE,
};

afterEach(() => {
  for (const [key, value] of Object.entries(PRESERVED)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe('root environment loading', () => {
  function envFile(): string {
    const directory = mkdtempSync(path.join(tmpdir(), 'sysone-env-'));
    const file = path.join(directory, '.env');
    writeFileSync(
      file,
      ['DATABASE_URL=postgres://from-file', 'BASE_URL=https://from-file', 'ONLY_IN_FILE=file'].join('\n'),
      'utf-8',
    );
    return file;
  }

  it('lets an inline shell override survive', () => {
    process.env.DOTENV_CONFIG_PATH = envFile();
    process.env.DATABASE_URL = 'postgres://from-shell';
    delete process.env.ONLY_IN_FILE;

    loadLabEnv({ overrideKeys: ['BASE_URL'] });

    assert.equal(process.env.DATABASE_URL, 'postgres://from-shell');
    assert.equal(process.env.ONLY_IN_FILE, 'file');
  });

  it('forces only explicitly named keys', () => {
    process.env.DOTENV_CONFIG_PATH = envFile();
    process.env.BASE_URL = 'https://stale-shell-export';
    loadLabEnv({ overrideKeys: ['BASE_URL'] });
    assert.equal(process.env.BASE_URL, 'https://from-file');
  });

  it('resolves an explicit database URL and otherwise uses the local default', () => {
    assert.equal(databaseUrl({ DATABASE_URL: 'postgres://explicit' }), 'postgres://explicit');
    assert.equal(databaseUrl({}), DEFAULT_DATABASE_URL);
  });
});
