# 1. No backend: everything runs in the browser

- **Status:** accepted
- **Date:** 2026-09-21

## Context

Barista analyses Java source code that people upload. That code is often
coursework, sometimes work in progress, occasionally something the author would
rather not hand to a third party at all.

The conventional shape for this kind of tool is a server: accept an upload, run
the analysis where there is real CPU and memory, return a result. That shape
brings obligations with it. Uploaded source has to be stored somewhere, even
briefly. Storage has a retention policy, and a policy needs a privacy statement
people have to take on faith. The server needs hosting, monitoring, a deployment
pipeline, and a plan for what happens when someone uploads a 2 GB archive.

None of that work makes the diagrams better. All of it exists to manage a risk
that only appears because the code left the user's machine.

The analysis itself does not need a server. Parsing, type resolution,
relationship inference and layout are all pure computation over text, and every
piece of that runs in a browser today: tree-sitter compiles to WebAssembly,
`fflate` reads zip archives, ELK does graph layout in JavaScript, and Web
Workers keep the main thread free.

## Decision

Barista is a static site with no backend. The uploaded archive is read in the
browser, analysed in a Web Worker, and rendered locally. No network request
carries user source code, because there is no endpoint to carry it to.

Deployment is static file hosting — GitHub Pages in practice, any file server in
principle. The Docker image is nginx serving a directory.

This is enforced structurally rather than by policy. `packages/core` cannot
import Angular or DOM-only APIs (`pnpm deps:check` fails the build), so the
engine stays runnable in a Worker. There is no HTTP client anywhere in the
dependency tree to accidentally reach for.

## Consequences

**What this buys**

The privacy claim needs no trust. "Your code never leaves your machine" is not a
promise about our conduct; it is a description of the architecture, and anyone
can verify it in devtools by watching the network tab stay empty.

Operating the project costs nothing and requires nothing. There is no server to
patch, no database to back up, no bill that scales with use. A personal tool that
demands ongoing maintenance stops being used.

It works offline once loaded, and it keeps working if the repository is
abandoned.

**What it costs**

Everything runs inside the browser's budget. A very large project competes with
the tab's memory, and parsing happens on the user's CPU rather than a machine
chosen for the job. The measured numbers are reassuring — 471 files parse in
203 ms — but there is a ceiling, and `BARISTA_MAX_FILES` exists to stop users
discovering it by freezing a tab.

**Dependency resolution is out of reach.** This is the sharpest limitation.
Barista sees only the source files in the archive. It cannot read `.class`
files, resolve a Maven or Gradle dependency graph, or look inside a jar. A type
from a library is a name with no definition behind it, classified as external
and kept off the diagram rather than resolved. For a tool aimed at understanding
your own code, that is an acceptable trade; for one that needed to diagram a
dependency's internals, it would not be.

There is no server-side cache. Re-analysing the same archive redoes the work
every time.

## Alternatives considered

**A server-side analyser.** More headroom, full dependency resolution via a real
build tool, and the ability to cache results. Rejected because the privacy cost
is paid by every user on every upload, while the benefit only appears for large
projects — and the operational burden would likely outlive anyone's willingness
to maintain it.

**A local CLI.** No browser limits, direct filesystem access, and it could shell
out to `javac`. Rejected because it changes who can use the tool: a CLI needs
installation, a runtime, and a terminal. A URL needs a browser. For a study aid,
reach matters more than headroom.

**A hybrid — client-side by default, optional server for large projects.**
Rejected as YAGNI. It doubles the analysis paths that must agree with each
other, and no measured case yet exceeds what the browser handles comfortably.
Worth revisiting only if a real project is shown to exceed the browser's limits.
