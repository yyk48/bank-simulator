import { mkdir, copyFile } from 'node:fs/promises';
import { BANKS } from '../dist/database/bank-code.js';

const target = new URL('../dist/database/seeds/data/', import.meta.url);
await mkdir(target, { recursive: true });
for (const bank of BANKS) {
  await copyFile(
    new URL(`../src/database/seeds/data/${bank}.json`, import.meta.url),
    new URL(`${bank}.json`, target),
  );
}