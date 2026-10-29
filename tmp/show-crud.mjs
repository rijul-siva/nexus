import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const fs = require('fs');
const path = require('path');

const files = [
  'backend/src/routes/fileRoutes.js',
  'backend/src/routes/userRoutes.js',
  'backend/src/routes/authRoutes.js',
];

for (const file of files) {
  console.log('=== ' + file + ' ===');
  const text = fs.readFileSync(path.resolve(file), 'utf8');
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/router\.(get|post|patch|delete|use)\(/.test(line) || /@route/.test(line)) {
      console.log((i + 1).toString().padStart(3) + ' | ' + line);
    }
  }
  console.log('');
}
