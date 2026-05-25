import { performance } from "node:perf_hooks";
import { options } from "preact";

(globalThis as any).performance = performance;
(globalThis as any).__DEBUG__ = false;

// The `jsdom` environment already provides `window`/`document`. Wire up the
// ReactLynx-style `preactDevtoolsCtx` host object that the adapter reads DOM
// access from (see `const window = preactDevtoolsCtx` in adapter.ts), plus the
// minimal `lynx` native bridge stub the adapter expects to exist.
(options as any).document = document;

// Copy the enumerable globals as own data properties (so tests can freely
// reassign e.g. `preactDevtoolsCtx.document`), and explicitly pull over the
// non-enumerable `Node` constructor used by `parent instanceof
// preactDevtoolsCtx.Node` in options.ts.
(globalThis as any).preactDevtoolsCtx = {
	...globalThis,
	Node: (globalThis as any).Node,
	performance,
	Blob,
};

(globalThis as any).lynx = {
	getNativeApp: () => {
		return {
			callLepusMethod: () => {},
		};
	},
};
