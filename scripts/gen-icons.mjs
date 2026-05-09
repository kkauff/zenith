// Icon generation now uses the Knewave Outline glyph and lives in the
// matching Python script (Pillow does TTF rasterization that's painful in
// pure Node). This wrapper invokes it so `node scripts/gen-icons.mjs` still
// works, and surfaces the Pillow install hint if the dep is missing.
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const script = resolve(__dirname, 'gen-icons.py');

const result = spawnSync('python3', [script], { stdio: 'inherit' });
if (result.status !== 0) {
  console.error(
    '\nIf this failed with ModuleNotFoundError, run: pip3 install Pillow fonttools',
  );
  process.exit(result.status ?? 1);
}
