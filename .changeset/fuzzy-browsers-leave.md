---
"rpc-anywhere": major
---

Move browser transport exports to `rpc-anywhere/transports` so the root entry point no longer references DOM globals in non-browser TypeScript projects. The browser runtime port transport now uses structural port types and no longer depends on `browser-namespace`.
