import { performance } from "node:perf_hooks";
import { options } from "preact";
import { JSDOM } from "jsdom";
import { LynxTestingEnv } from "@lynx-js/testing-environment";

(globalThis as any).__DEBUG__ = false;

// Unlike the standard setup, the Lynx test run drives the adapter through the
// dual-threaded ReactLynx runtime emulated by `LynxTestingEnv`. Its constructor
// reads `global.jsdom`, so that has to be created first.
(globalThis as any).jsdom = new JSDOM();
const lynxTestingEnv = new LynxTestingEnv();
(globalThis as any).lynxTestingEnv = lynxTestingEnv;
lynxTestingEnv.mainThread.globalThis.getUniqueIdListBySnapshotId = () => {
	return [];
};
lynxTestingEnv.switchToBackgroundThread();

const { window } = lynxTestingEnv.jsdom;
(globalThis as any).window = window;
(globalThis as any).document = window.document;
(globalThis as any).performance = performance;
(options as any).document = window.document;

(globalThis as any).preactDevtoolsCtx = {
	...lynxTestingEnv.mainThread.globalThis,
	performance,
	Blob: window.Blob,
};
