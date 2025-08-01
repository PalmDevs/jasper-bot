import type { Target } from 'bun'

await Bun.build({
    entrypoints: ['./src/index.ts'],
    outdir: './dist',
    minify: {
        identifiers: false,
        syntax: true,
        whitespace: true,
    },
    packages: 'bundle',
    external: ['ffmpeg-static', 'erlpack', 'zlib-sync', './config.js'],
    sourcemap: 'external',
    target: (process.argv[2] as Target) ?? 'bun',
})
