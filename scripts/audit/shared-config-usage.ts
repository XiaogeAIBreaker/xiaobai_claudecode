import * as fs from 'fs';
import * as path from 'path';
import { listSharedConfigEntries } from '../../src/shared/config/catalog';
import { SharedConfigUsageMatrix } from '../../src/shared/types/shared-config';

const ROOT = process.cwd();
const OUTPUT_PATH = path.resolve(ROOT, 'docs/refactor/004/data-sources/post-scan.json');
const SEARCH_DIRS = ['src', 'tests'];

interface FileMatch {
  filePath: string;
  content: string;
}

function readFiles(): FileMatch[] {
  const files: FileMatch[] = [];

  const walk = (dir: string) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      const absPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'build') {
          continue;
        }
        walk(absPath);
      } else if (/\.(ts|tsx|js|jsx|json)$/.test(entry.name)) {
        const content = fs.readFileSync(absPath, 'utf8');
        files.push({ filePath: absPath, content });
      }
    }
  };

  for (const dir of SEARCH_DIRS) {
    const absDir = path.join(ROOT, dir);
    if (fs.existsSync(absDir)) {
      walk(absDir);
    }
  }

  return files;
}

function buildUsageMatrix(): SharedConfigUsageMatrix {
  const files = readFiles();
  const entries = listSharedConfigEntries();

  const usage = entries.map((entry) => {
    const matchedFiles = files
      .filter(({ content }) => content.includes(entry.id))
      .map(({ filePath }) => path.relative(ROOT, filePath))
      .sort();

    return {
      id: entry.id,
      files: Array.from(new Set(matchedFiles)),
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    entries: usage,
  };
}

function ensureOutputDir(): void {
  const dir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function run(): SharedConfigUsageMatrix {
  const matrix = buildUsageMatrix();
  ensureOutputDir();
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(matrix, null, 2), 'utf8');
  console.log(`[shared-config-usage] 写入审计结果 -> ${OUTPUT_PATH}`);
  return matrix;
}

if (require.main === module) {
  run();
}
