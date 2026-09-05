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

	bridge: InstanceIdBridge | undefined;
	snapshotIdToId: Map<number, ID>;
	idToUniqueIdList: Map<ID, number[] | undefined>;
	uniqueIdToId: Map<number, ID>;

	updateSnapshotId: (oldId: number, newId: number) => void;
	updateIdToUniqueIdRelation: (snapshotId: number, id: number) => void;
}

/**
 * How the background instance behind a vnode (`vnode.__e`) is keyed, and how
 * the main thread resolves that key to element unique ids.
 *
 * The snapshot runtime keys a `BackgroundSnapshotInstance` by `__id`; the
 * Element Template runtime keys a `BackgroundElementTemplateInstance` by its
 * handle id (`instanceId`). Both re-key on first hydration and announce it
 * through a `GlobalEventEmitter` event.
 */
export interface InstanceIdBridge {
	readInstanceId: (dom: any) => number;
	lepusMethod: string;
	lepusParam: string;
	updateIdEvent: string;
}

export const snapshotBridge: InstanceIdBridge = {
	readInstanceId: dom => dom.__id,
	lepusMethod: "getUniqueIdListBySnapshotId",
	lepusParam: "snapshotId",
	updateIdEvent: "onBackgroundSnapshotInstanceUpdateId",
};

export const elementTemplateBridge: InstanceIdBridge = {
	readInstanceId: dom => dom.instanceId,
	lepusMethod: "getUniqueIdListByElementTemplateHandleId",
	lepusParam: "handleId",
	updateIdEvent: "onBackgroundElementTemplateInstanceUpdateId",
};

export const instanceIdBridges = [snapshotBridge, elementTemplateBridge];

/**
 * Picks the bridge for the runtime backend the ReactLynx runtime publishes.
 * Resolved lazily (on the first vnode) because the runtime may register its
 * backend after the devtools hook is installed.
 */
export function detectInstanceIdBridge(): InstanceIdBridge {
	try {
		return (
			// @ts-ignore
			lynx[Symbol.for("__REACT_LYNX_RUNTIME_BACKEND__")] === "Element Template"
				? elementTemplateBridge
				: snapshotBridge
		);
	} catch (e) {
		return snapshotBridge;
	}
}

function getBridge<T>(state: IdMappingState<T>): InstanceIdBridge {
	return (state.bridge ??= detectInstanceIdBridge());
}

export function createIdMappingState<T extends SharedVNode>(
	initial: number,
	getInstance: (vnode: T) => any,
	bridge?: InstanceIdBridge,
): IdMappingState<T> {
	return {
		bridge,
		instToId: new Map(),
		idToVNode: new Map(),
		idToInst: new Map(),
		nextId: initial,
		getInstance,

		snapshotIdToId: new Map(),
		idToUniqueIdList: new Map(),
		uniqueIdToId: new Map(),

		updateSnapshotId: function (oldId: number, newId: number) {
			if (this.snapshotIdToId.has(oldId)) {
				const id = this.snapshotIdToId.get(oldId)!;
				this.snapshotIdToId.delete(oldId);
				this.snapshotIdToId.set(newId, id);

				this.updateIdToUniqueIdRelation(newId, id);
			}
		},

		updateIdToUniqueIdRelation: function (snapshotId: number, id: number) {
			const bridge = getBridge(this);
			lynx
				// @ts-expect-error type error
				.getNativeApp()
				.callLepusMethod(
					bridge.lepusMethod,
					{ [bridge.lepusParam]: snapshotId },
					(ret: { uniqueIdList: number[] }) => {
						if (ret?.uniqueIdList == null) {
							// console.warn("Failed to get unique id for snapshot", snapshotId);
							return;
						}
						const { uniqueIdList } = ret;
						this.idToUniqueIdList.set(id, uniqueIdList);
						if (uniqueIdList != null) {
							for (const uniqueId of uniqueIdList) {
								this.uniqueIdToId.set(uniqueId, id);
							}
						}
					},
				);
		},
	};
}

export function getVNodeById<T>(state: IdMappingState<T>, id: ID): T | null {
	return state.idToVNode.get(id) || null;
}
export function getUniqueListIdById<T>(
	state: IdMappingState<T>,
	id: ID,
): number[] | null {
	return state.idToUniqueIdList.get(id) || null;
}
export function getUniqueListIdBySnapshotId<T>(
	state: IdMappingState<T>,
	snapshotId: number,
): number[] | null {
	const id = state.snapshotIdToId.get(snapshotId);
	if (!id) return null;
	return state.idToUniqueIdList.get(id) || null;
}
export function getUniqueListIdByDom<T>(
	state: IdMappingState<T>,
	dom: any,
): number[] | null {
	let snapshotId;
	try {
		snapshotId = getBridge(state).readInstanceId(dom);
	} catch (e) {
		return null;
	}
	return getUniqueListIdBySnapshotId(state, snapshotId);
}
export function getIdByUniqueId<T>(
	state: IdMappingState<T>,
	uniqueId: number,
): ID | null {
	return state.uniqueIdToId.get(uniqueId) || null;
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

	let snapshotId;
	try {
		// @ts-ignore
		snapshotId = getBridge(state).readInstanceId(vnode.__e);
	} catch (e) {
		// When a component returns null/Fragment
		// it will has no `__e` property, so it has
		// no related snapshotInstance.
		return;
	}
	state.snapshotIdToId.set(snapshotId, id);

	state.updateIdToUniqueIdRelation(snapshotId, id);
}

export function removeVNodeId<T>(state: IdMappingState<T>, vnode: T) {
	if (hasVNodeId(state, vnode)) {
		const id = getVNodeId(state, vnode);
		state.idToInst.delete(id);
		state.idToVNode.delete(id);

		let snapshotId;
		try {
			// @ts-ignore
			snapshotId = getBridge(state).readInstanceId(vnode.__e);
		} catch (e) {
			// When a component returns null/Fragment
			// it will has no `__e` property, so it has
			// no related snapshotInstance.
			return;
		}
		state.snapshotIdToId.delete(snapshotId);

		const uniqueIdList = state.idToUniqueIdList.get(id);
		state.idToUniqueIdList.delete(id);
		if (uniqueIdList != null) {
			for (const uniqueId of uniqueIdList) {
				state.uniqueIdToId.delete(uniqueId);
			}
		}
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

	let snapshotId: number;
	try {
		// @ts-ignore
		snapshotId = getBridge(state).readInstanceId(vnode.__e);
	} catch (e) {
		// When a component returns null/Fragment
		// it will has no `__e` property, so it has
		// no related snapshotInstance.
		return id;
	}
	state.snapshotIdToId.set(snapshotId, id);

	state.updateIdToUniqueIdRelation(snapshotId, id);
	return id;
}
