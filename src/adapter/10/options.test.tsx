import { Fragment, options } from "preact";
import { expect } from "vitest";
import { setupOptionsV10 } from "./options";
import { createRenderer } from "../shared/renderer";
import { bindingsV10 } from "./bindings";
import { newProfiler } from "../adapter/profiler";
import { createIdMappingState } from "../shared/idMapper";

describe("setupOptionsV10", () => {
	describe("_root hook (root container detection)", () => {
		// Regression test for the ReactLynx host where `globalThis.Node` is
		// undefined but `preactDevtoolsCtx.Node` is shimmed with the
		// `BackgroundSnapshotInstance` constructor (`react-lynx/setup.ts`).
		// The `__root` snapshot has no `parentNode`, so the old guard
		// `"Node" in globalThis && parent instanceof preactDevtoolsCtx.Node`
		// fell through to `parent.parentNode`, set `userRootToContainer`
		// to `null`, and `_commit` skipped `roots.set(vnode, dom)`. That
		// left `getRootMappings()` permanently empty -- breaking
		// `refresh` / `applyFilters` / `root-order-page` even after the
		// `document.body` shim landed.
		it("treats a preactDevtoolsCtx.Node container as the root container, even with no globalThis.Node and no parentNode", () => {
			const hadGlobalNode = Object.prototype.hasOwnProperty.call(
				globalThis,
				"Node",
			);
			const originalGlobalNode = (globalThis as any).Node;
			const hadCtxNode = Object.prototype.hasOwnProperty.call(
				preactDevtoolsCtx,
				"Node",
			);
			const originalCtxNode = preactDevtoolsCtx.Node;

			// Reproduce the ReactLynx Background VM environment:
			// `globalThis.Node` is missing and the application root has no
			// parent. We build a custom Node-like base class so we can
			// instantiate parent-less containers (jsdom `Node`s always
			// keep a real parent chain and would not exercise the bug).
			class FakeBackgroundSnapshotInstance {
				childNodes: FakeBackgroundSnapshotInstance[] = [];
				parentNode: FakeBackgroundSnapshotInstance | null = null;
				nodeName = "ROOT";
				appendChild(child: FakeBackgroundSnapshotInstance) {
					child.parentNode = this;
					this.childNodes.push(child);
					return child;
				}
				insertBefore(
					child: FakeBackgroundSnapshotInstance,
					_ref: FakeBackgroundSnapshotInstance | null,
				) {
					return this.appendChild(child);
				}
				removeChild(child: FakeBackgroundSnapshotInstance) {
					const idx = this.childNodes.indexOf(child);
					if (idx >= 0) this.childNodes.splice(idx, 1);
					child.parentNode = null;
					return child;
				}
			}

			preactDevtoolsCtx.Node = FakeBackgroundSnapshotInstance as any;
			delete (globalThis as any).Node;

			try {
				const fakeRoot = new FakeBackgroundSnapshotInstance();

				// We do not run a full Preact mount here because Preact 10
				// expects a real DOM-ish node with the browser createElement
				// surface. Instead we drive the option hooks directly with
				// shapes that match what Preact would pass: `_root` reports
				// the container, then `_commit` reports the matching root
				// VNode.
				const events: Array<[string, unknown]> = [];
				const roots = new Map();
				const renderer = createRenderer(
					{
						send: (type, data) => {
							events.push([type, data]);
						},
						listen: () => {},
						listenToPage: () => {},
					},
					{ Fragment: Fragment as any },
					options,
					{ hooks: false, renderReasons: false },
					newProfiler(),
					{ type: new Set(), regex: [] },
					createIdMappingState(1, bindingsV10.getInstance),
					bindingsV10,
					roots,
					"",
				);
				const destroy = setupOptionsV10(options, renderer, roots, {
					Fragment: Fragment as any,
				});

				try {
					const o = options as any;

					// Reproduce the call sequence Preact 10 emits during a
					// successful mount. `_root` is invoked with the *user*
					// vnode and the container DOM (`render(<App/>, container)`),
					// then `_commit` is invoked with the synthetic Fragment
					// root that wraps the user vnode.
					const childVNode: any = {
						type: "div",
						props: { children: null },
						_children: [],
						__k: [],
						_parent: null,
						__: null,
						_component: null,
						__c: null,
						_dom: new FakeBackgroundSnapshotInstance(),
						__e: undefined,
					};
					childVNode.__e = childVNode._dom;

					const rootVNode: any = {
						type: Fragment,
						props: { children: childVNode },
						_children: [childVNode],
						__k: [childVNode],
						_parent: null,
						__: null,
						_component: null,
						__c: null,
					};
					childVNode._parent = rootVNode;
					childVNode.__ = rootVNode;

					(o._root || o.__).call(o, childVNode, fakeRoot);
					(o._commit || o.__c).call(o, rootVNode, []);

					expect(roots.size).to.equal(
						1,
						"the root vnode must be tracked in `roots` after commit",
					);

					const mappings = renderer.getRootMappings();
					expect(mappings.length).to.equal(
						1,
						"`getRootMappings` is what `applyFilters` and `root-order-page` consume",
					);
					expect(mappings[0].node).to.equal(
						fakeRoot,
						"the parentless container must be used as-is, not its (null) parentNode",
					);
				} finally {
					destroy();
				}
			} finally {
				// Restore both globals exactly to their pre-test shape. A
				// plain reassignment would leave an own `Node` property set
				// to `undefined` when the property never existed (the
				// ReactLynx test setup is exactly that case), which would
				// make `"Node" in globalThis` true for subsequent tests and
				// break `instanceof Node` callers.
				if (hadGlobalNode) {
					(globalThis as any).Node = originalGlobalNode;
				} else {
					delete (globalThis as any).Node;
				}
				if (hadCtxNode) {
					preactDevtoolsCtx.Node = originalCtxNode;
				} else {
					delete (preactDevtoolsCtx as any).Node;
				}
			}
		});
	});
});
