import type { Target } from 'bun'

await Bun.build({
    entrypoints: ['./config.js'],
    outdir: './dist',
    packages: 'bundle',
    target: (process.argv[2] as Target) ?? 'bun',
})
