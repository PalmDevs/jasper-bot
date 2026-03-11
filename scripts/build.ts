import type { Target } from 'bun'

await Bun.build({
    entrypoints: ['./src/index.ts'],
    outdir: './dist',
    packages: 'bundle',
    external: ['ffmpeg-static', 'erlpack', 'zlib-sync', '@snazzah/davey', './config.js'],
    sourcemap: 'external',
    target: (process.argv[2] as Target) ?? 'bun',
})
