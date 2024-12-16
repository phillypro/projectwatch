// scripts/glob_ts_files.js

import { globby } from 'globby';
import { Command } from 'commander';
import untildify from 'untildify';
import { readFile, appendFile, unlink } from 'node:fs/promises';
import { ensureDir } from 'fs-extra/esm';
import path from 'node:path';
import open from 'open';

const program = new Command();
program
  .name('concat-ts-files')
  .description('Concatenate .ts files from a directory')
  .argument('<path>', 'directory to search');

program.parse();

const rawPath = program.args[0];
const expandedPath = untildify(rawPath);

// Convert Windows backslashes to forward slashes for glob
const forwardSlashPath = expandedPath.replace(/\\/g, '/');

console.log('Searching in directory:', expandedPath);
console.log('Using glob pattern:', `${forwardSlashPath}/**/*.{ts}`);

const files = await globby(`${forwardSlashPath}/**/*.{ts,tsx}`, {
  onlyFiles: true,
  ignore: ['**/node_modules/**', '**/dist/**'],
});

console.log('Found files:', files.length);
if (files.length === 0) {
  console.log('No TypeScript files found in the specified directory.');
  process.exit(1);
}

// Convert rawPath into an array of path segments
const pathSegments = rawPath.split(path.sep).filter(Boolean);

// Sanitize segments to remove invalid filename characters on Windows
const sanitizedSegments = pathSegments.map(segment =>
  segment.replace(/[<>:"/\\|?*]+/g, '_')
);

const fileName = sanitizedSegments.join('-');
const outputFile = path.join(process.cwd(), 'tmp', `${fileName}.txt`);
console.log('Output file will be:', outputFile);

await ensureDir(path.dirname(outputFile));

// If output file already exists, remove it
try {
  await unlink(outputFile);
} catch (e) {
  // No problem if it doesn't exist
}

for (const file of files) {
  // Compute relative path from the original directory
  let relativeFilePath = path.relative(expandedPath, file);
  // Normalize to forward slashes
  relativeFilePath = relativeFilePath.replace(/\\/g, '/');
  
  console.log('Processing file:', relativeFilePath);

  const contents = await readFile(file, 'utf8');
  await appendFile(outputFile, `// ${relativeFilePath}\n`);
  await appendFile(outputFile, contents);
}

console.log('Done! Opening output directory...');
await open(path.dirname(outputFile));
