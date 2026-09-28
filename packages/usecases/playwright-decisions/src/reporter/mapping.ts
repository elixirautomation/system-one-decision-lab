import path from 'node:path';

export function mapPlaywrightStatus(status: string): 'passed' | 'failed' | 'skipped' {
  if (status === 'passed') return 'passed';
  if (status === 'skipped') return 'skipped';
  return 'failed';
}

export function buildSuiteName(file: string, titlePath: string[], projectName: string): string {
  const relativeFile = path.relative(process.cwd(), file) || file;
  const fileNames = new Set([file, relativeFile, path.basename(file)]);
  const hierarchy = titlePath
    .slice(0, -1)
    .filter((part) => part && part !== projectName && !fileNames.has(part));
  return [relativeFile, ...hierarchy].join(' > ');
}
