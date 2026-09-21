# 4. Lay out the diagram with ELK

- **Status:** accepted
- **Date:** 2026-09-21

## Context

Once the model exists, the boxes have to be placed and the edges routed between
them. Doing this badly is what makes generated diagrams look generated:
overlapping nodes, edges crossing through unrelated boxes, lines at arbitrary
diagonals.

Two established layout engines were measured on graphs shaped like real class
diagrams — an inheritance hierarchy plus scattered associations.

| Nodes        | `elkjs` 0.12.0            | `dagre` 3.1.1       |
| ------------ | ------------------------- | ------------------- |
| 15 (typical) | 98 ms cold, 13–19 ms warm | 15 ms, 7–12 ms warm |
| 150          | 418 ms                    | 118 ms              |
| 200          | 869 ms                    | 163 ms              |
| 400          | 3,675 ms                  | 362 ms              |

dagre is decisively faster — roughly 3.5× at realistic sizes and an order of
magnitude at 400 nodes. Neither produced overlapping nodes.

Speed was not the deciding factor. Edge routing was.

|                      | `elkjs`                      | `dagre`              |
| -------------------- | ---------------------------- | -------------------- |
| Orthogonal segments  | **39 / 39 (100%)**           | 21 / 44 (48%)        |
| Bend points per edge | real routing, obstacle-aware | 3.6, spline skeleton |

ELK routed `Inventory → Product` with four bends, steering the edge around the
intervening boxes. dagre emitted control points intended to be smoothed into a
spline — useful for a flow chart, but not a route that avoids obstacles.

Orthogonal routing is not decoration. Right-angled connectors _are_ the visual
language of UML class diagrams; a diagram with diagonal association lines reads
as something else entirely. And writing an obstacle-avoiding orthogonal router
is not a weekend of work — it is one of the genuinely hard problems in graph
drawing, and doing it badly is worse than not doing it.

## Decision

Use `elkjs` with its `layered` algorithm, running in a Web Worker.

The cost that looked prohibitive turns out not to be. The main bundle carries
only `elk-api.js` at **2.1 KB gzipped** — the 454 KB engine loads inside the
worker, off the critical path and off the main thread. Measured in a real
Worker: 150 nodes laid out in 142 ms with the main thread never blocked.

The performance gap is therefore paid in a place where it is not felt. 418 ms in
a Worker while the UI stays responsive and shows progress is a materially
different experience from 418 ms of frozen tab, and the difference between that
and dagre's 118 ms is not perceptible when neither blocks interaction.

## Consequences

**What this buys**

Diagrams look like UML rather than like graph-library output. Edges take clean
right-angled paths around obstacles instead of cutting across the canvas.

Layout never blocks the interface. The tab stays interactive during analysis,
which matters more than the raw millisecond count.

ELK's `layered` algorithm suits inheritance naturally: supertypes settle above
subtypes without being told to.

**What it costs**

Layout is asynchronous, so the rendering layer must handle a diagram that exists
before its coordinates do — a loading state rather than a synchronous call.

Past roughly 250 classes, layout time grows steeply (869 ms at 200, 3.7 s at
400). The intended answer is filtering by package before rendering, not a faster
engine: a 400-class diagram on one canvas is unreadable regardless of how well
it is laid out.

ELK carries configuration surface. The `layered` options are numerous and
interact; tuning them is empirical work, and defaults should be changed only
with a before/after to justify it.

**What was given up**

dagre's speed, and its smaller footprint. Both were real advantages, and both
were outweighed by routing quality.

## Alternatives considered

**`dagre` 3.1.1.** Faster, lighter, no Worker strictly required. Rejected on
routing: 48% orthogonal segments means roughly half the edges would need
post-processing into right angles by hand, which amounts to writing the router
we chose ELK to avoid.

**Cytoscape or a full diagramming library** (`@antv/x6`, JointJS). These bring
layout, rendering and interaction together. Rejected because they impose their
own visual language, which fights the design system, and because they render
markup we do not control — PNG export depends on clean SVG with inline styles
and no `foreignObject`. Owning the rendering is what keeps export working.

**Hand-rolled layout.** Tempting for a hierarchy, until associations turn the
tree into a general graph and the problem becomes obstacle-avoiding orthogonal
routing. Rejected as a large amount of difficult work to arrive somewhere worse.

**Static layout with fixed grid positions.** Trivial to implement and genuinely
unreadable beyond about ten classes. Rejected.
