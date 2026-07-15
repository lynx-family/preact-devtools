import { BackgroundSnapshotInstance } from "@lynx-js/react/runtime/lib/backgroundSnapshot";
import type { UnsafeLynx } from "@lynx-js/types";

interface FiberElement {}

declare global {
	declare module "*.css" {
		const styles: Record<string, string>;
		export default styles;
	}

	declare const __DEBUG__: boolean;
	/**
	 * The global context of preact-devtools will be injected to ReactLynx App
	 */
	interface PreactDevtoolsCtx {
		__DEBUG__?: boolean;
		/**
		 * Whether the host's main thread implements the
		 * `getUniqueIdListBySnapshotId` lepus debug method used to map vnodes to
		 * native UI nodes (Elements/screencast linkage). Native Lynx does; the
		 * web platform currently does not, so the mapping is skipped there.
		 */
		supportsUniqueIdMapping?: boolean;
		lynx?: UnsafeLynx;
		__page?: FiberElement;
		__root?: BackgroundSnapshotInstance & {
			__jsx?: React.ReactNode;
		};
		lynxCoreInject?: {
			tt: any;
		};
		addEventListener: (
			type: string,
			listener: (e: { source: any; data: any }) => void,
		) => void;
		postMessage: (message: any, targetOrigin: string) => void;
		localStorage: Storage;
		performance: Performance;
		Node: typeof BackgroundSnapshotInstance;
		document: {
			body: BackgroundSnapshotInstance;
		};
		Blob: typeof Blob;
	}

	/**
	 * The global context of preact-devtools will be injected to Lynx Devtool
	 */
	interface PreactDevtoolsLDTCtx {
		devtoolsProps: {
			addEventListener: (type: string, cb: (msg: string) => void) => void;
			postMessage: (type: string, msg: string | Record<string, any>) => void;
			isOSSLynxDevtool: boolean;
			addOnScreenCastPanelUINodeIdSelectedListener: (
				cb: (UINodeId: number) => void,
			) => void;
			onPreactDevtoolsPanelUINodeIdSelected: (UINodeId: number) => void;
		};
		addEventListener: (
			type: string,
			listener: (e: MessageEvent) => void,
		) => void;
		removeEventListener: (
			type: string,
			listener: (e: MessageEvent) => void,
		) => void;
		postMessage: (message: any, targetOrigin: string) => void;
		highlightUniqueId?: number;
	}
	// eslint-disable-next-line no-var
	var preactDevtoolsLDTCtx: PreactDevtoolsLDTCtx;
}

// The devtools context is hung off the per-page `lynx` object (instead of the
// process-wide `globalThis`, which persists across page navigations) so every
// page starts with a fresh context.
declare module "@lynx-js/types/background" {
	interface Lynx {
		preactDevtoolsCtx: PreactDevtoolsCtx;
	}
}
