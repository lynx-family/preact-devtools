import type {} from "@lynx-js/react";
import { __root, __page } from "@lynx-js/react/internal";

export function setupReactLynx() {
	if (__BACKGROUND__) {
		try {
			// @ts-ignore
			if (typeof lynx.getDevtool !== "function") {
				throw new Error(
					"`lynx.getDevtool` is not a function: on native Lynx, please upgrade " +
						"your LynxSDK to the latest version; on the web platform, please " +
						"upgrade @lynx-js/web-core to a version with the devtool event " +
						"channel.",
				);
			}

			// @ts-ignore
			lynx.preactDevtoolsCtx ||= {};

			const __DEBUG__ = lynx.preactDevtoolsCtx.__DEBUG__;
			if (__DEBUG__) {
				console.log("[PREACT DEVTOOLS] debug mode is enabled");
			}

			if (__DEBUG__) {
				// For quick debug in HDT console
				Object.assign(lynx.preactDevtoolsCtx, {
					lynx,
					__page,
					__root,
					// @ts-ignore
					lynxCoreInject,
				});
			}

			const listeners: Record<
				string,
				((e: { source: any; data: any }) => void)[]
			> = {};
			lynx.preactDevtoolsCtx.addEventListener = (type, callback) => {
				if (!listeners[type]) {
					listeners[type] = [];
				}
				listeners[type].push(callback);
			};
			const dispatch = (message: { source: any; type: any; data: any }) => {
				for (let i = 0; i < (listeners["message"]?.length ?? 0); i++) {
					try {
						listeners["message"]?.[i]?.({
							source: lynx.preactDevtoolsCtx,
							data: message,
						});
					} catch (e) {
						console.warn("[PREACT DEVTOOLS] listener failed:", e);
					}
				}
			};

			lynx.preactDevtoolsCtx.postMessage = (
				{ source, type, data },
				// eslint-disable-next-line @typescript-eslint/no-unused-vars
				_targetOrigin,
			) => {
				dispatch({ source, type, data });

				if (__DEBUG__) {
					// App -> Devtools
					console.log("devtools transport send", {
						source,
						type,
						data,
					});
				}
				// @ts-ignore
				lynx.getDevtool().dispatchEvent({
					type: "PreactDevtools",
					data: JSON.stringify({
						source,
						type,
						data,
					}),
				});
			};

			const deliver = (dataObj: { source: any; type: any; data: any }) => {
				if (__DEBUG__) {
					console.log("devtools -> frontend message received", dataObj);
				}
				const { source, type, data } = dataObj;
				dispatch({ source, type, data });
			};
			// @ts-ignore
			lynx.getDevtool().addEventListener("PreactDevtools", e => {
				deliver(JSON.parse(e.data));
			});

			if (
				typeof lynx.preactDevtoolsCtx.localStorage === "undefined" ||
				lynx.preactDevtoolsCtx.localStorage === null
			) {
				const storage: Record<string, string> = {};

				lynx.preactDevtoolsCtx.localStorage = {
					getItem: function (key) {
						if (__DEBUG__) console.log(`getItem called with key: ${key}`);
						return Object.prototype.hasOwnProperty.call(storage, key)
							? (storage[key] ?? null)
							: null;
					},
					setItem: function (key, value) {
						if (__DEBUG__) {
							console.log(`setItem called with key: ${key}, value: ${value}`);
						}
						storage[key] = value.toString();
					},
					removeItem: function (key) {
						if (__DEBUG__) console.log(`removeItem called with key: ${key}`);
						delete storage[key];
					},
					clear: function () {
						if (__DEBUG__) console.log("clear called");
						for (const key in storage) {
							if (Object.prototype.hasOwnProperty.call(storage, key)) {
								delete storage[key];
							}
						}
					},
					key: function (index) {
						if (__DEBUG__) console.log(`key called with index: ${index}`);
						const keys = Object.keys(storage);
						return keys[index] || null;
					},
					get length() {
						if (__DEBUG__) console.log("length property accessed");
						return Object.keys(storage).length;
					},
				};
			}

			if (
				typeof lynx.preactDevtoolsCtx.performance === "undefined" ||
				lynx.preactDevtoolsCtx.performance === null
			) {
				if (__DEBUG__) console.log("Mocking performance API...");

				const marks: any[] = [];
				const measures: any[] = [];
				const startTime = Date.now();

				lynx.preactDevtoolsCtx.performance = {
					now: function () {
						return Date.now() - startTime;
					},
					// @ts-ignore
					mark: function (markName) {
						if (__DEBUG__) {
							console.log(`performance.mark called with markName: ${markName}`);
						}
						marks.push({
							name: markName,
							entryType: "mark",
							startTime: this.now(),
							duration: 0,
						});
					},
					// @ts-ignore
					measure: function (measureName, startMark, endMark) {
						if (__DEBUG__) {
							console.log(
								`performance.measure called with measureName: ${measureName}, startMark: ${startMark}, endMark: ${endMark}`,
							);
						}
						const start = marks.find(mark => mark.name === startMark);
						const end = marks.find(mark => mark.name === endMark);
						if (start && end) {
							measures.push({
								name: measureName,
								entryType: "measure",
								startTime: start.startTime,
								duration: end.startTime - start.startTime,
							});
						} else {
							if (__DEBUG__) {
								console.warn("Invalid marks for performance.measure");
							}
						}
					},
					getEntriesByType: function (type) {
						if (__DEBUG__) {
							console.log(
								`performance.getEntriesByType called with type: ${type}`,
							);
						}
						if (type === "mark") {
							return [...marks];
						} else if (type === "measure") {
							return [...measures];
						}
						return [];
					},
					clearMarks: function (markName) {
						if (__DEBUG__) {
							console.log(
								`performance.clearMarks called with markName: ${markName}`,
							);
						}
						if (markName) {
							for (let i = marks.length - 1; i >= 0; i--) {
								if (marks[i].name === markName) {
									marks.splice(i, 1);
								}
							}
						} else {
							marks.length = 0; // Clear all marks
						}
					},
					clearMeasures: function (measureName) {
						if (__DEBUG__) {
							console.log(
								`performance.clearMeasures called with measureName: ${measureName}`,
							);
						}
						if (measureName) {
							for (let i = measures.length - 1; i >= 0; i--) {
								if (measures[i].name === measureName) {
									measures.splice(i, 1);
								}
							}
						} else {
							measures.length = 0; // Clear all measures
						}
					},
				};
			}

			// Shims for:
			// const treeParent = ...
			if (
				typeof lynx.preactDevtoolsCtx.Node === "undefined" ||
				lynx.preactDevtoolsCtx.Node === null
			) {
				// @ts-ignore
				lynx.preactDevtoolsCtx.Node = __root.__proto__.constructor;
			}
			// }
			// Shims for:
			// const sorted = sortRoots(document.body, roots);
			if (
				typeof lynx.preactDevtoolsCtx.document === "undefined" ||
				lynx.preactDevtoolsCtx.document === null
			) {
				lynx.preactDevtoolsCtx.document = {
					// @ts-ignore
					body: __root,
				};
			}
			// Shims for:
			// else if (data instanceof window.Blob) {
			if (
				typeof lynx.preactDevtoolsCtx.Blob === "undefined" ||
				lynx.preactDevtoolsCtx.Blob === null
			) {
				// @ts-ignore
				lynx.preactDevtoolsCtx.Blob = class Blob {
					constructor(parts: any, options: any) {
						if (__DEBUG__) console.log("Blob constructor", parts, options);
					}
				};
			}

			// preact/devtools discovers the hook on globalThis, which is shared
			// across cards in Lynx's shared-context mode — mount it there only
			// while its initDevTools runs.
			const mountHook = () => {
				(globalThis as any).__PREACT_DEVTOOLS__ =
					lynx.preactDevtoolsCtx.__PREACT_DEVTOOLS__;
			};
			const unmountHook = () => {
				delete (globalThis as any).__PREACT_DEVTOOLS__;
			};

			// Must stay synchronous when modules are sync: deferring attach past
			// the app's first render loses the initial commit for good.
			const installHookModule = require("../shells/shared/installHook");
			if (
				installHookModule &&
				typeof (installHookModule as any).then === "function"
			) {
				(installHookModule as Promise<unknown>)
					.then(() => {
						mountHook();
						return Promise.resolve(require("preact/devtools"));
					})
					.then(() => {
						unmountHook();
						console.log("[PREACT DEVTOOLS] Devtools initialized successfully");
					})
					.catch(e => {
						unmountHook();
						console.warn("[PREACT DEVTOOLS] Devtools failed to initialize:");
						console.warn(e);
					});
			} else {
				mountHook();
				try {
					require("preact/devtools");
				} finally {
					unmountHook();
				}
				console.log("[PREACT DEVTOOLS] Devtools initialized successfully");
			}
		} catch (e) {
			console.warn("[PREACT DEVTOOLS] Devtools failed to initialize:");
			console.warn(e);
		}
	}
}
