import fs from 'fs';
import path from 'path';

const filesToPatch = [
  path.resolve('node_modules/html2canvas/dist/html2canvas.js'),
  path.resolve('node_modules/html2canvas/dist/html2canvas.esm.js'),
];

for (const filePath of filesToPatch) {
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    if (content.includes('Attempting to parse an unsupported color function')) {
      content = content.replace(
        /if\s*\(\s*typeof colorFunction\s*===\s*['"]undefined['"]\s*\)\s*\{[\s\S]*?throw new Error\([^)]*\);?\s*\}/g,
        'if (typeof colorFunction === "undefined") { return COLORS.TRANSPARENT; }'
      );
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Successfully patched ${filePath}`);
    } else {
      console.log(`Already patched or pattern not found in ${filePath}`);
    }
  }
}
