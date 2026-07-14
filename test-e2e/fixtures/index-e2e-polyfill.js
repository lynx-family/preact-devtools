window.lynxCoreInject = {
	tt: {},
};
window.lynx = {
	getJSModule() {
		return {
			addListener() {},
			removeAllListeners() {},
		};
	},
	getNativeApp() {
		return {
			callLepusMethod() {},
		};
	},
};
window.lynx.preactDevtoolsCtx = window;
