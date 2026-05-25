import { expect } from "vitest";
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

function makeRenderer(rootMappings: RootData[]): Renderer {
	// Only `getRootMappings` is exercised by the `root-order-page` listener; the
	// rest of the Renderer surface is intentionally left unimplemented to keep
	// the regression test focused on the body-of-undefined crash path.
	return {
		refresh: () => {},
		getVNodeById: () => null,
		getUniqueListIdById: () => null,
		getUniqueListIdBySnapshotId: () => null,
		getIdByUniqueId: () => null,
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
		it("reads document.body from preactDevtoolsCtx, not the global scope", () => {
			// Regression test for the ReactLynx host where `globalThis.document`
			// is undefined. The adapter aliases `window = preactDevtoolsCtx`
			// (adapter.ts) so every DOM access must go through `window.*`. A
			// stray bare `document.body` reference used to crash here with
			// `TypeError: cannot read property 'body' of undefined` on the
			// `refresh` -> `applyFilters` -> `port.send("root-order-page")`
			// path.
			const fakeBody = window.document.createElement("div");
			const child = window.document.createElement("div");
			fakeBody.appendChild(child);

			const originalCtxDocument = preactDevtoolsCtx.document;
			const originalGlobalDocument = (globalThis as any).document;
			(preactDevtoolsCtx as any).document = { body: fakeBody };

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
				(preactDevtoolsCtx as any).document = originalCtxDocument;
				(globalThis as any).document = originalGlobalDocument;
			}
		});
	});
});
