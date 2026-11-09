import { copyFileSync, mkdirSync } from 'node:fs';
mkdirSync('demo/public', { recursive: true });
copyFileSync('dist/vending-machine-3d.umd.js', 'demo/public/vending-machine-3d.umd.js');
console.log('copied UMD → demo/public');
