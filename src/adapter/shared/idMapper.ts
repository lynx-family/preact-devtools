import { ID } from "../../view/store/types";
import { SharedVNode } from "./bindings";

/**
 * VNode relationships are encoded as simple numbers for the devtools. We use
 * this function to keep track of existing id's and create new ones if needed.
 */
export interface IdMappingState<T> {
	instToId: Map<any, ID>;
	idToVNode: Map<ID, T>;
	idToInst: Map<ID, any>;
	nextId: ID;
	getInstance: (vnode: T) => any;

	snapshotIdToId: Map<number, ID>;

	bindSnapshotId: (snapshotId: number, id: ID) => void;
	updateSnapshotId: (oldId: number, newId: number) => void;
	removeSnapshotId: (id: ID) => void;
}

export function createIdMappingState<T extends SharedVNode>(
	initial: number,
	getInstance: (vnode: T) => any,
): IdMappingState<T> {
	const idToSnapshotId = new Map<ID, number>();
	const snapshotOwners = new Map<number, Set<ID>>();

	function forgetSnapshot(
		state: IdMappingState<T>,
		id: ID,
		snapshotId: number,
	) {
		const owners = snapshotOwners.get(snapshotId);
		if (owners) {
			owners.delete(id);
			if (owners.size === 0) snapshotOwners.delete(snapshotId);
		}
		if (state.snapshotIdToId.get(snapshotId) === id) {
			state.snapshotIdToId.delete(snapshotId);
			for (const otherId of owners || []) {
				state.snapshotIdToId.set(snapshotId, otherId);
			}
		}
	}

	return {
		instToId: new Map(),
		idToVNode: new Map(),
		idToInst: new Map(),
		nextId: initial,
		getInstance,

		snapshotIdToId: new Map(),

		bindSnapshotId: function (snapshotId: number, id: ID) {
			const prevSnapshotId = idToSnapshotId.get(id);
			if (prevSnapshotId !== undefined && prevSnapshotId !== snapshotId) {
				forgetSnapshot(this, id, prevSnapshotId);
			}
			idToSnapshotId.set(id, snapshotId);
			this.snapshotIdToId.set(snapshotId, id);
			let owners = snapshotOwners.get(snapshotId);
			if (!owners) {
				owners = new Set();
				snapshotOwners.set(snapshotId, owners);
			}
			owners.delete(id);
			owners.add(id);
		},

		updateSnapshotId: function (oldId: number, newId: number) {
			for (const id of [...(snapshotOwners.get(oldId) || [])]) {
				this.bindSnapshotId(newId, id);
			}
		},

		removeSnapshotId: function (id: ID) {
			const snapshotId = idToSnapshotId.get(id);
			idToSnapshotId.delete(id);
			if (snapshotId !== undefined) {
				forgetSnapshot(this, id, snapshotId);
			}
		},
	};
}

export function getVNodeById<T>(state: IdMappingState<T>, id: ID): T | null {
	return state.idToVNode.get(id) || null;
}

export function getIdBySnapshotId<T>(
	state: IdMappingState<T>,
	snapshotId: number,
): ID | null {
	return state.snapshotIdToId.get(snapshotId) ?? null;
}

export function hasVNodeId<T>(state: IdMappingState<T>, vnode: T) {
	return vnode != null && state.instToId.has(state.getInstance(vnode));
}

export function getVNodeId<T>(state: IdMappingState<T>, vnode: T) {
	if (vnode == null) return -1;
	const inst = state.getInstance(vnode);
	return state.instToId.get(inst) || -1;
}

export function getOrCreateVNodeId<T>(
	state: IdMappingState<T>,
	vnode: T,
): number | undefined {
	const id = getVNodeId(state, vnode);
	if (id !== -1) return id;
	return createVNodeId(state, vnode);
}

export function updateVNodeId<T>(state: IdMappingState<T>, id: ID, vnode: T) {
	const inst = state.getInstance(vnode);
	state.idToInst.set(id, inst);
	state.idToVNode.set(id, vnode);

	let snapshotId: number | undefined;
	try {
		// @ts-ignore
		snapshotId = vnode.__e.__id;
	} catch (e) {
		// When a component returns null/Fragment
		// it will has no `__e` property, so it has
		// no related snapshotInstance.
		state.removeSnapshotId(id);
		return;
	}
	if (snapshotId == null) {
		state.removeSnapshotId(id);
		return;
	}
	state.bindSnapshotId(snapshotId, id);
}

export function removeVNodeId<T>(state: IdMappingState<T>, vnode: T) {
	if (hasVNodeId(state, vnode)) {
		const id = getVNodeId(state, vnode);
		state.idToInst.delete(id);
		state.idToVNode.delete(id);
		state.removeSnapshotId(id);
	}
	const inst = state.getInstance(vnode);
	state.instToId.delete(inst);
}

export function createVNodeId<T>(state: IdMappingState<T>, vnode: T) {
	const id = state.nextId++;
	const inst = state.getInstance(vnode);
	state.instToId.set(inst, id);
	state.idToInst.set(id, inst);
	state.idToVNode.set(id, vnode);

	let snapshotId: number | undefined;
	try {
		// @ts-ignore
		snapshotId = vnode.__e.__id;
	} catch (e) {
		// When a component returns null/Fragment
		// it will has no `__e` property, so it has
		// no related snapshotInstance.
		return id;
	}
	if (snapshotId != null) {
		state.bindSnapshotId(snapshotId, id);
	}
	return id;
}
