# Barista — production image.
#
# Two stages: build the static site with Node, then serve it with nginx. The
# result is a plain static file server, because that is genuinely all Barista
# needs — there is no backend, no runtime configuration and no process that
# holds state. See docs/adr/0001-client-side-only.md.
#
#   docker compose up --build        preview at http://localhost:4300
#
# Note: this image cannot be built until packages/core and apps/web are
# scaffolded and a pnpm-lock.yaml is committed.

# ──────────────────────────────────────────────────────────────────────────────
# Stage 1 — build
# ──────────────────────────────────────────────────────────────────────────────
FROM node:24.21.0-alpine AS build

# Pinned to match packageManager in package.json. Installed directly rather than
# through corepack, which is on its way out of the Node distribution.
RUN npm install --global pnpm@10.24.0

WORKDIR /app

# Manifests first, so `pnpm install` is only re-run when dependencies actually
# change rather than on every source edit.
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/core/package.json packages/core/
COPY apps/web/package.json apps/web/

RUN pnpm install --frozen-lockfile

COPY . .

# Consumed by the Angular build to set <base href>. Overridden for GitHub Pages,
# which serves the app from a project subpath.
ARG BARISTA_BASE_HREF=/
ARG BARISTA_BUILD_LABEL=docker
ENV BARISTA_BASE_HREF=${BARISTA_BASE_HREF}
ENV BARISTA_BUILD_LABEL=${BARISTA_BUILD_LABEL}

RUN pnpm build

# Angular's output path depends on its project configuration, so resolve it by
# locating index.html instead of hardcoding a guess that breaks on a rename.
RUN set -eux; \
    index="$(find apps/web/dist -name index.html -print -quit)"; \
    test -n "$index" || { echo 'build produced no index.html'; exit 1; }; \
    mkdir -p /site; \
    cp -r "$(dirname "$index")/." /site/

# ──────────────────────────────────────────────────────────────────────────────
# Stage 2 — runtime
# ──────────────────────────────────────────────────────────────────────────────
# nginx-unprivileged runs as a non-root user (uid 101) and listens on 8080,
# which avoids the usual root-master/worker split of the stock nginx image.
FROM nginxinc/nginx-unprivileged:alpine AS runtime

LABEL org.opencontainers.image.title="Barista"
LABEL org.opencontainers.image.description="A browser-based toolkit for inspecting Java code."
LABEL org.opencontainers.image.source="https://github.com/FlorianLucchini/barista"
LABEL org.opencontainers.image.licenses="MIT"

COPY docker/nginx.conf            /etc/nginx/conf.d/default.conf
COPY docker/security-headers.inc  /etc/nginx/conf.d/security-headers.inc
COPY --from=build /site /usr/share/nginx/html

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --spider http://localhost:8080/ || exit 1
