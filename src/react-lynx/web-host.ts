// Keep in sync with `src/constants.ts`; dependency-free so tsc emits a
// standalone file.
const DEVTOOLS_TO_CLIENT = "preact-devtools-to-client";

// The devtool event name shared with `setup.ts` (mirrors the native Lynx
// DevTool CDP channel).
const DEVTOOL_EVENT = "PreactDevtools";

interface DevtoolPayload {
	source: string;
	type: string;
	data: unknown;
}

function main() {
	// App (worker) -> devtools: web-core routes `lynx.getDevtool()` events to
	// a composed `devtoolMessage` CustomEvent on the owning `<lynx-view>`,
	// which bubbles out of any shadow tree up to the window.
	window.addEventListener("devtoolMessage", event => {
		const detail = (event as CustomEvent<{ type?: string; data?: string }>)
			.detail;
		if (detail?.type !== DEVTOOL_EVENT || typeof detail.data !== "string") {
			return;
		}
		try {
			window.postMessage(JSON.parse(detail.data), "*");
		} catch {}
	});

	// Devtools -> app (worker): forward panel messages to every `<lynx-view>`
	// through its per-view devtool event bridge.
	window.addEventListener("message", e => {
		if (
			e.source !== window ||
			(e.data as DevtoolPayload | null)?.source !== DEVTOOLS_TO_CLIENT
		) {
			return;
		}
		const data = JSON.stringify(e.data);
		document.querySelectorAll("lynx-view").forEach(view => {
			(
				view as { sendDevtoolEvent?: (type: string, data: string) => void }
			).sendDevtoolEvent?.(DEVTOOL_EVENT, data);
		});
	});
}

if (process.env.NODE_ENV === "development") {
	main();
}

export {};
