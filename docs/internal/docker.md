# Docker

Barista's Docker image builds the static site and serves it with nginx. There is
no application server in it, because there is no backend to run — see
[ADR 0001](../adr/0001-client-side-only.md).

## What it is for

The image is **not** the development environment. `pnpm dev` is faster, has hot
reload, and is what you should use to write code.

The image exists to preview the production build exactly as it is deployed. That
matters for the things the dev server papers over:

- `<base href>` handling, which breaks silently when deployed to a subpath
- Cache headers on hashed and unhashed assets
- Whether the tree-sitter `.wasm` files are served as `application/wasm` — if
  they are not, parsing falls back to a slower path without an error message

## Usage

```bash
docker compose up --build       # build and serve at http://localhost:4300
docker compose down             # stop
```

Port 4300 is deliberate: it stays clear of the Angular dev server on 4200, so
both can run at once.

To build the image directly:

```bash
docker build -t barista:local .
docker run --rm -p 4300:8080 barista:local
```

### Previewing the GitHub Pages path

Pages serves the site from `/barista/`, not from the root. To reproduce that
locally:

```bash
docker build --build-arg BARISTA_BASE_HREF=/barista/ -t barista:pages .
```

Note that the container still serves from `/`, so asset URLs will 404 — which is
exactly the failure you are looking for if the base href is wrong. The
deployment workflow checks this assertion directly rather than relying on
someone noticing.

## How the image is built

Two stages.

**Build** starts from `node:24.21.0-alpine`, matching `.nvmrc`. pnpm is
installed with `npm install --global pnpm@10.24.0` rather than through corepack,
which is being removed from Node distributions. Manifests are copied before
sources so `pnpm install` is cached independently of code changes.

After `pnpm build`, a step locates `index.html` under `apps/web/dist` and copies
its directory to `/site`. Angular's output path depends on project
configuration, and resolving it this way survives a rename that a hardcoded path
would not.

**Runtime** uses `nginxinc/nginx-unprivileged:alpine`, which runs as uid 101 and
listens on 8080. The stock nginx image runs its master process as root; this one
avoids that without any extra configuration.

The compose service also runs with a read-only root filesystem, `tmpfs` mounts
for the paths nginx needs to write, and `no-new-privileges`. None of this is
strictly necessary for a static file server, but it costs nothing and the habit
is worth keeping.

## The nginx configuration

`docker/nginx.conf`, plus `docker/security-headers.inc`. Four things worth
knowing:

| Concern       | Handling                                            |
| ------------- | --------------------------------------------------- |
| SPA routing   | `try_files $uri $uri/ /index.html`                  |
| WebAssembly   | `application/wasm` set explicitly — see below       |
| Hashed assets | `public, max-age=31536000, immutable`               |
| `index.html`  | never cached, since it points at every hashed asset |

The explicit `types { application/wasm wasm; }` block is not redundant
defensiveness. Recent nginx builds do include it in `mime.types`, but when the
type is wrong the browser refuses to stream-compile the module and silently
falls back — no error, just worse performance, and a long afternoon working out
why.

### Why the security headers are in an include

`add_header` in nginx **replaces** inherited headers rather than merging them.
A location block that declares any `add_header` of its own loses every
`add_header` set at server level — so defining the security headers once on the
server and cache headers per location silently drops the security headers on
exactly the paths that matter.

`security-headers.inc` is therefore included into each location that sets
headers. The `.inc` extension keeps the `conf.d/*.conf` glob from loading it as
a standalone server block.

This was found by testing the running container rather than by reading the
config, which is the argument for doing that at all:

```bash
curl -sI http://localhost:4300/ | grep -iE 'x-frame|x-content-type|referrer'
```

### Two regexes and a quoting rule

nginx reads a bare `{` as the start of a block, so a `location` pattern
containing a `{8,}` quantifier fails to parse with a confusing "unknown
directive" error. The hashed-asset pattern is quoted for that reason.

Similarly, combining `expires 1y` with `add_header Cache-Control` emits **two**
Cache-Control headers. The config sets the full value in one `add_header`
instead.

**There is no Content-Security-Policy header, deliberately.** The Emscripten
glue that loads the tree-sitter runtime uses `eval`, so a policy without
`unsafe-eval` breaks parsing entirely. Adding a CSP means either allowing
`unsafe-eval` — which gives up most of the benefit — or switching to the
`java-parser` fallback. The trade-off is recorded in
[ADR 0002](../adr/0002-tree-sitter-for-parsing.md).

## Requirements before this builds

The image cannot be built until:

1. `packages/core/package.json` and `apps/web/package.json` exist — the
   Dockerfile copies them by name for layer caching.
2. `pnpm-lock.yaml` is committed — the install uses `--frozen-lockfile`.
3. `pnpm build` produces an `index.html` somewhere under `apps/web/dist`.

Until phase 1 scaffolding lands, `docker compose up` fails at the copy step.
That is expected.
