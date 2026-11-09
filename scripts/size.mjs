import { readFileSync, readdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const LIMIT_KB = 60;
const files = readdirSync('dist').filter((f) => f.endsWith('.js') && !f.includes('umd') && f !== 'vue.js');
let total = 0;
for (const f of files) {
  const gz = gzipSync(readFileSync(`dist/${f}`)).length;
  total += gz;
  console.log(`${f.padEnd(28)} ${(gz / 1024).toFixed(1)} KB gzip`);
}
const vue = gzipSync(readFileSync('dist/vue.js')).length;
const umd = gzipSync(readFileSync('dist/vending-machine-3d.umd.js')).length;
console.log(`vue.js (wrapper)             ${(vue / 1024).toFixed(1)} KB gzip`);
console.log(`umd (incl. three)            ${(umd / 1024).toFixed(1)} KB gzip`);
console.log(`core total                   ${(total / 1024).toFixed(1)} KB gzip (limit ${LIMIT_KB} KB)`);
if (total / 1024 > LIMIT_KB) {
  console.error('Size limit exceeded');
  process.exit(1);
}
