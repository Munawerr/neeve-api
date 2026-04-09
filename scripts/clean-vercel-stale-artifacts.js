const fs = require('node:fs');
const path = require('node:path');

const projectRoot = process.cwd();
const srcDir = path.join(projectRoot, 'src');
const staleMailDir = path.join(srcDir, 'mail');

function removeIfExists(targetPath) {
  if (!fs.existsSync(targetPath)) {
    return;
  }

  fs.rmSync(targetPath, { recursive: true, force: true });
  console.log(`Removed: ${path.relative(projectRoot, targetPath)}`);
}

function walk(dirPath) {
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    const ext = path.extname(entry.name);
    if (ext !== '.js' && ext !== '.map' && ext !== '.ts') {
      continue;
    }

    // Delete generated siblings only when a TypeScript source file exists.
    if (entry.name.endsWith('.js')) {
      const tsSibling = fullPath.slice(0, -3) + '.ts';
      if (fs.existsSync(tsSibling)) {
        removeIfExists(fullPath);
      }
      continue;
    }

    if (entry.name.endsWith('.js.map')) {
      const tsSibling = fullPath.slice(0, -7) + '.ts';
      if (fs.existsSync(tsSibling)) {
        removeIfExists(fullPath);
      }
      continue;
    }

    if (entry.name.endsWith('.d.ts')) {
      const tsSibling = fullPath.slice(0, -5) + '.ts';
      if (fs.existsSync(tsSibling)) {
        removeIfExists(fullPath);
      }
    }
  }
}

if (fs.existsSync(srcDir)) {
  removeIfExists(staleMailDir);
  walk(srcDir);
}
