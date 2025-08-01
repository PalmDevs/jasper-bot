FROM oven/bun:latest AS base

FROM base AS build

WORKDIR /build
COPY . .
RUN bun install --frozen-lockfile --production
RUN bun run build

FROM base AS release

WORKDIR /app
COPY --from=build /build/dist /app/dist
# Default config file (can be shadowed by a volume)
COPY --from=build /build/config.js /app/config.js

USER bun

ENTRYPOINT [ "bun", "--bun", "run", "dist/index.js" ]
