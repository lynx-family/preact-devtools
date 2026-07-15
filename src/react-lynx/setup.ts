import type {} from "@lynx-js/react";
import { __root, __page } from "@lynx-js/react/internal";

export function setupReactLynx() {
	if (__BACKGROUND__) {
		try {
			// Transport to the devtools panel:
			// - native Lynx: the LDT CDP channel exposed via `lynx.getDevtool()`.
			// - web platform (e.g. a web simulator): there is no `getDevtool`, but
			//   the background worker shares a BroadcastChannel origin with the
			//   hosting page, where a small bridge can relay messages to the
			//   Preact Devtools browser extension (see README).
			// @ts-ignore
			const hasNativeDevtool = typeof lynx.getDevtool === "function";
			const WebChannel = (globalThis as any).BroadcastChannel;
			const webChannel =
				!hasNativeDevtool && typeof WebChannel === "function"
					? new WebChannel("preact-devtools")
					: null;
			if (!hasNativeDevtool && !webChannel) {
				throw new Error(
					"No devtools transport is available: `lynx.getDevtool` is not a function " +
						"(on native Lynx, please upgrade your LynxSDK to the latest version) " +
						"and `BroadcastChannel` is not available (on the web platform, it is " +
						"required to reach the devtools panel).",
				);
			}

			// @ts-ignore
			lynx.preactDevtoolsCtx ||= {};

			// Native Lynx implements the `getUniqueIdListBySnapshotId` lepus debug
			// method used for Elements/screencast linkage; the web platform does
			// not (yet). Hosts can override this before setup runs.
			lynx.preactDevtoolsCtx.supportsUniqueIdMapping ??= hasNativeDevtool;

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
			// One faulty listener must not break delivery to the rest (or crash
			// the transport's onmessage handler).
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
				// in-App to-self message
				dispatch({ source, type, data });

				if (__DEBUG__) {
					// App -> Devtools
					console.log("devtools transport send", {
						source,
						type,
						data,
					});
				}
				if (hasNativeDevtool) {
					// @ts-ignore
					lynx.getDevtool().dispatchEvent({
						type: "PreactDevtools",
						data: JSON.stringify({
							source,
							type,
							data,
						}),
					});
				} else {
					webChannel.postMessage({ source, type, data });
				}
			};

			const deliver = (dataObj: { source: any; type: any; data: any }) => {
				if (__DEBUG__) {
					console.log("devtools -> frontend message received", dataObj);
				}
				const { source, type, data } = dataObj;
				dispatch({ source, type, data });
			};
			if (hasNativeDevtool) {
				// @ts-ignore
				lynx.getDevtool().addEventListener("PreactDevtools", e => {
					deliver(JSON.parse(e.data));
				});
			} else {
				webChannel.onmessage = (e: { data: any }) => deliver(e.data);
			}

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

			// When ReactLynx is consumed as an *async* external bundle these
			// become async modules (their `preact` import is mounted as a
			// Promise), so a CJS require() returns a Promise of the namespace
			// and we must chain them to keep the required order: the hook must
			// be installed before `preact/devtools` connects to it.
			//
			// When modules are synchronous, attach synchronously: deferring to a
			// microtask would let the app's first `root.render()` run *before*
			// the options hooks are wrapped, and on a static app that first
			// commit is the only one — the devtools would never see the tree.
			const installHookModule = require("../shells/shared/installHook");
			if (
				installHookModule &&
				typeof (installHookModule as any).then === "function"
			) {
				(installHookModule as Promise<unknown>)
					.then(() => Promise.resolve(require("preact/devtools")))
					.then(() => {
						console.log("[PREACT DEVTOOLS] Devtools initialized successfully");
					})
					.catch(e => {
						console.warn("[PREACT DEVTOOLS] Devtools failed to initialize:");
						console.warn(e);
					});
			} else {
				require("preact/devtools");
				console.log("[PREACT DEVTOOLS] Devtools initialized successfully");
			}
		} catch (e) {
			console.warn("[PREACT DEVTOOLS] Devtools failed to initialize:");
			console.warn(e);
		}
	}
}
