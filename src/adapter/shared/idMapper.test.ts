import { afterEach, describe, expect, it, vi } from "vitest";
import {
	createIdMappingState,
	createVNodeId,
	detectInstanceIdBridge,
	elementTemplateBridge,
	getUniqueListIdByDom,
	removeVNodeId,
	snapshotBridge,
} from "./idMapper";

const backendKey = Symbol.for("__REACT_LYNX_RUNTIME_BACKEND__");

function mockLynx(extra: Record<PropertyKey, unknown> = {}) {
	const callLepusMethod = vi.fn();
	(globalThis as any).lynx = {
		getNativeApp: () => ({ callLepusMethod }),
		...extra,
	};
	return callLepusMethod;
}

describe("idMapper instance-id bridge", () => {
	afterEach(() => {
		delete (globalThis as any).lynx;
	});

	it("picks the bridge from the runtime backend the ReactLynx runtime publishes", () => {
		(globalThis as any).lynx = { [backendKey]: "Element Template" };
		expect(detectInstanceIdBridge()).toBe(elementTemplateBridge);

		(globalThis as any).lynx = { [backendKey]: "Snapshot" };
		expect(detectInstanceIdBridge()).toBe(snapshotBridge);

		(globalThis as any).lynx = {};
		expect(detectInstanceIdBridge()).toBe(snapshotBridge);

		delete (globalThis as any).lynx;
		expect(detectInstanceIdBridge()).toBe(snapshotBridge);
	});

	it("resolves the bridge lazily, after the runtime registered its backend", () => {
		const callLepusMethod = mockLynx();
		const state = createIdMappingState<any>(1, v => v);
		(globalThis as any).lynx[backendKey] = "Element Template";

		createVNodeId(state, { __e: { instanceId: 7 } });

		expect(state.bridge).toBe(elementTemplateBridge);
		expect(callLepusMethod).toHaveBeenCalledWith(
			"getUniqueIdListByElementTemplateHandleId",
			{ handleId: 7 },
			expect.any(Function),
		);
	});

	it("keys snapshot instances by __id and resolves them through getUniqueIdListBySnapshotId", () => {
		const callLepusMethod = mockLynx();
		const state = createIdMappingState<any>(1, v => v, snapshotBridge);
		const vnode = { __e: { __id: 5 } };

		const id = createVNodeId(state, vnode);

		expect(state.snapshotIdToId.get(5)).toBe(id);
		expect(callLepusMethod).toHaveBeenCalledWith(
			"getUniqueIdListBySnapshotId",
			{ snapshotId: 5 },
			expect.any(Function),
		);

		removeVNodeId(state, vnode);
		expect(state.snapshotIdToId.has(5)).toBe(false);
		expect(state.instToId.size).toBe(0);
	});

	it("keys Element Template instances by handle id and resolves them through getUniqueIdListByElementTemplateHandleId", () => {
		const callLepusMethod = mockLynx();
		const state = createIdMappingState<any>(1, v => v, elementTemplateBridge);
		const vnode = { __e: { instanceId: -3 } };

		const id = createVNodeId(state, vnode);

		expect(state.snapshotIdToId.get(-3)).toBe(id);
		expect(callLepusMethod).toHaveBeenCalledWith(
			"getUniqueIdListByElementTemplateHandleId",
			{ handleId: -3 },
			expect.any(Function),
		);
		callLepusMethod.mock.calls[0][2]({ uniqueIdList: [42] });
		expect(getUniqueListIdByDom(state, vnode.__e)).toEqual([42]);

		state.updateSnapshotId(-3, 9);
		expect(state.snapshotIdToId.get(9)).toBe(id);
		expect(callLepusMethod).toHaveBeenLastCalledWith(
			"getUniqueIdListByElementTemplateHandleId",
			{ handleId: 9 },
			expect.any(Function),
		);

		removeVNodeId(state, vnode);
		expect(state.instToId.size).toBe(0);
	});

	it("ignores vnodes without a background instance", () => {
		const callLepusMethod = mockLynx();
		const state = createIdMappingState<any>(1, v => v, elementTemplateBridge);

		expect(createVNodeId(state, {})).toBe(1);
		expect(getUniqueListIdByDom(state, undefined)).toBeNull();
		expect(callLepusMethod).not.toHaveBeenCalled();
	});
});
