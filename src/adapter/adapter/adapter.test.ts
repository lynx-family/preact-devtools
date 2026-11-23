import { expect, vi } from "vitest";
import { createAdapter } from "./adapter";
import { newProfiler } from "./profiler";
import { PortPageHook } from "./port";
import { Renderer } from "../renderer";
import { RootData } from "../shared/utils";
import { DevtoolEvents } from "../hook";

type Listener = (data: any) => void;

interface FakePort {
	port: PortPageHook;
	pageListeners: Map<string, Listener[]>;
	devtoolListeners: Map<string, Listener[]>;
	sent: Array<{ type: string; data: any }>;
}

function createFakePort(): FakePort {
	const pageListeners = new Map<string, Listener[]>();
	const devtoolListeners = new Map<string, Listener[]>();
	const sent: Array<{ type: string; data: any }> = [];

	const port: PortPageHook = {
		send: (type, message) => {
			sent.push({ type, data: message });
		},
		listen: (type, callback) => {
			const list = devtoolListeners.get(type) ?? [];
			list.push(callback as Listener);
			devtoolListeners.set(type, list);
		},
		listenToPage: (type, callback) => {
			const list = pageListeners.get(type) ?? [];
			list.push(callback as Listener);
			pageListeners.set(type, list);
		},
	};

	return { port, pageListeners, devtoolListeners, sent };
}

function fireFromPage<K extends keyof DevtoolEvents>(
	fake: FakePort,
	type: K,
	data: DevtoolEvents[K],
): void {
	for (const cb of fake.pageListeners.get(type) ?? []) {
		cb(data);
	}
}

function fireFromDevtools<K extends keyof DevtoolEvents>(
	fake: FakePort,
	type: K,
	data: DevtoolEvents[K],
): void {
	for (const cb of fake.devtoolListeners.get(type) ?? []) {
		cb(data);
	}
}

function makeRenderer(rootMappings: RootData[]): Renderer {
	// Only `getRootMappings` is exercised by the `root-order-page` listener; the
	// rest of the Renderer surface is intentionally left unimplemented to keep
	// the regression test focused on the body-of-undefined crash path.
	return {
		refresh: () => {},
		getVNodeById: () => null,
		getIdBySnapshotId: () => null,
		getDisplayName: () => "",
		findDomForVNode: () => null,
		findVNodeIdForDom: () => -1,
		applyFilters: () => {},
		log: () => {},
		inspect: () => null,
		update: () => {},
		onCommit: () => {},
		onUnmount: () => {},
		getRootMappings: () => rootMappings,
	};
}

describe("createAdapter", () => {
	describe("root-order-page", () => {
		it("reads document.body from lynx.preactDevtoolsCtx, not the global scope", () => {
			// Regression test for the ReactLynx host where `globalThis.document`
			// is undefined. The adapter aliases `window = lynx.preactDevtoolsCtx`
			// (adapter.ts) so every DOM access must go through `window.*`. A
			// stray bare `document.body` reference used to crash here with
			// `TypeError: cannot read property 'body' of undefined` on the
			// `refresh` -> `applyFilters` -> `port.send("root-order-page")`
			// path.
			const fakeBody = window.document.createElement("div");
			const child = window.document.createElement("div");
			fakeBody.appendChild(child);

			const originalCtxDocument = lynx.preactDevtoolsCtx.document;
			const originalGlobalDocument = (globalThis as any).document;
			(lynx.preactDevtoolsCtx as any).document = { body: fakeBody };

			// Simulate the ReactLynx Background VM, where the bundler-resolved
			// `document` global does not exist. Without the fix this is what
			// makes `document.body` throw at runtime.
			delete (globalThis as any).document;

			try {
				const fake = createFakePort();
				const renderer = makeRenderer([{ id: 42, node: child }]);
				const renderers = new Map<number, Renderer>([[1, renderer]]);

				createAdapter(fake.port, newProfiler(), renderers);

				expect(() =>
					fireFromPage(fake, "root-order-page", null),
				).not.to.throw();

				const sortMessages = fake.sent.filter(m => m.type === "root-order");
				expect(sortMessages.length).to.equal(1);
				expect(sortMessages[0].data).to.deep.equal([42]);
			} finally {
				(lynx.preactDevtoolsCtx as any).document = originalCtxDocument;
				(globalThis as any).document = originalGlobalDocument;
			}
		});
	});

	describe("refresh", () => {
		it("acknowledges a correlated refresh only after every renderer completes", () => {
			const fake = createFakePort();
			const firstRefresh = vi.fn(() => {
				fake.port.send("operation_v2", [1]);
			});
			const secondRefresh = vi.fn(() => {
				fake.port.send("root-order", [1]);
			});
			const renderers = new Map<number, Renderer>([
				[1, { ...makeRenderer([]), refresh: firstRefresh }],
				[2, { ...makeRenderer([]), refresh: secondRefresh }],
			]);

			createAdapter(fake.port, newProfiler(), renderers);
			fireFromDevtools(fake, "refresh", { requestId: "refresh-42" });

			expect(firstRefresh).toHaveBeenCalledTimes(1);
			expect(secondRefresh).toHaveBeenCalledTimes(1);
			expect(fake.sent).to.deep.equal([
				{ type: "operation_v2", data: [1] },
				{ type: "root-order", data: [1] },
				{ type: "refresh-complete", data: { requestId: "refresh-42" } },
			]);
		});

		it("re-sends attach so a late-connecting panel re-learns supports, then refreshes", () => {
			// A panel that connected after mount missed the initial `attach`, so it
			// never learned `supportsHooks`. The `refresh` handler must re-send
			// `attach` (in addition to re-walking the tree) so hooks inspection works
			// without a full page reload.
			const fake = createFakePort();
			const refresh = vi.fn();
			const renderer: Renderer = { ...makeRenderer([]), refresh };
			const renderers = new Map<number, Renderer>([[1, renderer]]);
			const rendererSupports = new Map([
				[1, { hooks: true, renderReasons: true, profiling: false }],
			]);

			createAdapter(fake.port, newProfiler(), renderers, rendererSupports);

			fireFromDevtools(fake, "refresh", null);

			const attaches = fake.sent.filter(m => m.type === "attach");
			expect(attaches.length).to.equal(1);
			expect(attaches[0].data).to.deep.equal({
				id: 1,
				supportsProfiling: false,
				supportsRenderReasons: true,
				supportsHooks: true,
			});
			expect(refresh).toHaveBeenCalledTimes(1);
			expect(
				fake.sent.filter(m => m.type === "refresh-complete"),
			).to.deep.equal([]);
		});

		it("sends no attach when supports are unknown, but still refreshes", () => {
			const fake = createFakePort();
			const refresh = vi.fn();
			const renderers = new Map<number, Renderer>([
				[1, { ...makeRenderer([]), refresh }],
			]);

			// No `rendererSupports` passed (back-compat default).
			createAdapter(fake.port, newProfiler(), renderers);

			fireFromDevtools(fake, "refresh", null);

			expect(fake.sent.filter(m => m.type === "attach").length).to.equal(0);
			expect(refresh).toHaveBeenCalledTimes(1);
		});
	});

	describe("highlight", () => {
		it("queries getUniqueIdListBySnapshotId lazily and ignores stale responses", () => {
			const callbacks: Array<(ret: any) => void> = [];
			const callLepusMethod = vi.fn((_method: any, _params: any, cb: any) => {
				callbacks.push(cb);
			});
			const getNativeApp = vi
				.spyOn(lynx as any, "getNativeApp")
				.mockReturnValue({ callLepusMethod });

			try {
				const fake = createFakePort();
				const vnodes = new Map<number, any>([
					[10, { type: "view" }],
					[20, { type: "view" }],
				]);
				const doms = new Map<number, any>([
					[10, [{ __id: 100 }, { __id: 100 }]],
					[20, [{ __id: 200 }, { __id: 200 }]],
				]);
				const renderer: Renderer = {
					...makeRenderer([]),
					getVNodeById: id => vnodes.get(id) ?? null,
					findDomForVNode: id => doms.get(id) ?? null,
				};
				const renderers = new Map<number, Renderer>([[1, renderer]]);

				createAdapter(fake.port, newProfiler(), renderers);
				fireFromDevtools(fake, "highlight", 10);
				fireFromDevtools(fake, "highlight", 20);

				expect(callLepusMethod).toHaveBeenCalledTimes(2);
				expect(callLepusMethod).toHaveBeenNthCalledWith(
					1,
					"getUniqueIdListBySnapshotId",
					{ snapshotId: 100 },
					expect.any(Function),
				);
				expect(callLepusMethod).toHaveBeenNthCalledWith(
					2,
					"getUniqueIdListBySnapshotId",
					{ snapshotId: 200 },
					expect.any(Function),
				);

				// First response arrives late and must be ignored.
				callbacks[0]({ uniqueIdList: [1001] });
				expect(fake.sent).to.deep.equal([]);

				callbacks[1]({ uniqueIdList: [2001] });
				expect(fake.sent).to.deep.equal([
					{
						type: "preact-devtools-highlight",
						data: { snapshotId: 200, uniqueId: 2001 },
					},
				]);

				// Clearing highlight invalidates any in-flight lookup.
				fireFromDevtools(fake, "highlight", 10);
				fireFromDevtools(fake, "highlight", null);
				callbacks[2]({ uniqueIdList: [1001] });
				expect(fake.sent.length).to.equal(1);
			} finally {
				getNativeApp.mockRestore();
			}
		});
	});

	describe("element-picked", () => {
		it("resolves snapshotId lazily via getSnapshotIdByUniqueId and ignores stale responses", () => {
			const callbacks: Array<(ret: any) => void> = [];
			const callLepusMethod = vi.fn((_method: any, _params: any, cb: any) => {
				callbacks.push(cb);
			});
			const getNativeApp = vi
				.spyOn(lynx as any, "getNativeApp")
				.mockReturnValue({ callLepusMethod });

			try {
				const fake = createFakePort();
				const snapshotToVNodeId = new Map<number, number>([
					[100, 10],
					[200, 20],
				]);
				const renderer: Renderer = {
					...makeRenderer([]),
					getIdBySnapshotId: snapshotId =>
						snapshotToVNodeId.get(snapshotId) ?? null,
				};
				const renderers = new Map<number, Renderer>([[1, renderer]]);

				createAdapter(fake.port, newProfiler(), renderers);
				fireFromDevtools(fake, "element-picked", { uniqueId: 1001 });
				fireFromDevtools(fake, "element-picked", { uniqueId: 2001 });

				expect(callLepusMethod).toHaveBeenCalledTimes(2);
				expect(callLepusMethod).toHaveBeenNthCalledWith(
					1,
					"getSnapshotIdByUniqueId",
					{ uniqueId: 1001 },
					expect.any(Function),
				);
				expect(callLepusMethod).toHaveBeenNthCalledWith(
					2,
					"getSnapshotIdByUniqueId",
					{ uniqueId: 2001 },
					expect.any(Function),
				);

				// Stale response from the first pick is dropped.
				callbacks[0]({ snapshotId: 100 });
				expect(fake.sent).to.deep.equal([]);

				callbacks[1]({ snapshotId: 200 });
				expect(fake.sent).to.deep.equal([
					{ type: "element-picked-vnode-id", data: { id: 20 } },
				]);

				// Disconnect invalidates an in-flight pick.
				fireFromDevtools(fake, "element-picked", { uniqueId: 1001 });
				fireFromDevtools(fake, "disconnect", null);
				callbacks[2]({ snapshotId: 100 });
				expect(fake.sent.length).to.equal(1);
			} finally {
				getNativeApp.mockRestore();
			}
		});
	});
});
