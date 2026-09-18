import { cp, mkdir, rm } from 'node:fs/promises';

await rm('dist', { recursive: true, force: true });
await mkdir('dist/assets/reference', { recursive: true });
await cp('web-static', 'dist', { recursive: true });
await cp('assets/highres', 'dist/assets/reference', { recursive: true });

console.log('Destrave web estático gerado em dist/');
