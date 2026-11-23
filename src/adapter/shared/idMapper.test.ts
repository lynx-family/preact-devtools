import { expect, vi } from "vitest";
import {
	createIdMappingState,
	createVNodeId,
	getIdBySnapshotId,
	hasVNodeId,
	removeVNodeId,
	updateVNodeId,
} from "./idMapper";

function makeVNode(inst: object, snapshotId?: number | null) {
	return {
		__c: inst,
		__e: snapshotId === undefined ? undefined : { __id: snapshotId },
	} as any;
}

describe("idMapper", () => {
	it("never calls callLepusMethod during create, update, hydration, or unmount", () => {
		const callLepusMethod = vi.fn();
		const getNativeApp = vi
			.spyOn(lynx as any, "getNativeApp")
			.mockReturnValue({ callLepusMethod });
		try {
			const state = createIdMappingState(1, (v: any) => v.__c);
			const inst = {};
			const vnode = makeVNode(inst, 10);

			const id = createVNodeId(state, vnode);
			expect(id).to.equal(1);
			expect(getIdBySnapshotId(state, 10)).to.equal(1);

			updateVNodeId(state, id, makeVNode(inst, 20));
			expect(getIdBySnapshotId(state, 10)).to.equal(null);
			expect(getIdBySnapshotId(state, 20)).to.equal(1);

			state.updateSnapshotId(20, 30);
			expect(getIdBySnapshotId(state, 20)).to.equal(null);
			expect(getIdBySnapshotId(state, 30)).to.equal(1);

			removeVNodeId(state, makeVNode(inst, 30));
			expect(getIdBySnapshotId(state, 30)).to.equal(null);
			expect(callLepusMethod).not.toHaveBeenCalled();
		} finally {
			getNativeApp.mockRestore();
		}
	});

	it("tracks multiple VNodes sharing one snapshotId across hydration and unmount", () => {
		const state = createIdMappingState(1, (v: any) => v.__c);
		const parentInst = {};
		const childInst = {};
		const parent = makeVNode(parentInst, 10);
		const child = makeVNode(childInst, 10);

		const parentId = createVNodeId(state, parent);
		const childId = createVNodeId(state, child);

		// Last writer wins while both VNodes share the snapshot.
		expect(getIdBySnapshotId(state, 10)).to.equal(childId);

		// Hydration re-keys every VNode sharing the snapshot.
		state.updateSnapshotId(10, 99);
		expect(getIdBySnapshotId(state, 10)).to.equal(null);
		expect(getIdBySnapshotId(state, 99)).to.equal(childId);

		// Removing the latest owner falls back to the remaining owner.
		removeVNodeId(state, child);
		expect(getIdBySnapshotId(state, 99)).to.equal(parentId);

		// Removing the last owner clears the snapshot entry.
		removeVNodeId(state, parent);
		expect(getIdBySnapshotId(state, 99)).to.equal(null);
	});

	it("cleans up snapshot and instance mappings even when __e is detached at unmount", () => {
		const state = createIdMappingState(1, (v: any) => v.__c);
		const inst = {};
		const vnode = makeVNode(inst, 42);

		createVNodeId(state, vnode);
		expect(getIdBySnapshotId(state, 42)).to.equal(1);
		expect(hasVNodeId(state, vnode)).to.equal(true);

		vnode.__e = null;
		removeVNodeId(state, vnode);

		expect(getIdBySnapshotId(state, 42)).to.equal(null);
		expect(hasVNodeId(state, vnode)).to.equal(false);
	});

	it("drops stale snapshot mapping when an updated VNode no longer has a snapshot", () => {
		const state = createIdMappingState(1, (v: any) => v.__c);
		const inst = {};
		const id = createVNodeId(state, makeVNode(inst, 7));
		expect(getIdBySnapshotId(state, 7)).to.equal(id);

		updateVNodeId(state, id, makeVNode(inst));
		expect(getIdBySnapshotId(state, 7)).to.equal(null);
	});
});
