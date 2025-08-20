const { expect } = require("chai");
const sinon = require("sinon");
const { JSDOM } = require("jsdom");
const { performance } = require("perf_hooks");
const { options } = require("preact");
const { LynxTestingEnv } = require("@lynx-js/testing-environment");

global.__DEBUG__ = false;

global.expect = expect;
global.sinon = sinon;

global.jsdom = new JSDOM();
global.lynxTestingEnv = new LynxTestingEnv(global.jsdom);
lynxTestingEnv.mainThread.globalThis.getUniqueIdListBySnapshotId = id => {
	return [];
};
lynxTestingEnv.switchToBackgroundThread();

global.window = lynxTestingEnv.jsdom.window;
global.performance = performance;
options.document = lynxTestingEnv.jsdom.window.document;
global.preactDevtoolsCtx = {
	...lynxTestingEnv.mainThread.globalThis,
	performance,
	Blob: window.Blob,
};
