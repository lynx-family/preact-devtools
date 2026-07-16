// Hosting-page helper for the web platform: importing this module bridges
// every `lynx-view` on the page to the official Preact Devtools browser
// extension, so the host needs no bespoke wiring:
//
//   import "@lynx-js/preact-devtools/web-host";
//
// Transport, in order of preference:
// 1. `lynxView.devtoolMessagePort` — the per-card devtool pipe exposed by
//    `@lynx-js/web-core` (point-to-point, multi-view/multi-tab safe). The
//    card side surfaces it as `lynx.getDevtool()`.
// 2. Fallback for older web-core versions without the port: the client's
//    `BroadcastChannel('preact-devtools')` transport. Note this channel is
//    origin-wide — debug one view per origin at a time on this path.

// Keep in sync with `src/constants.ts` (`DevtoolsToClient`). This module is
// intentionally dependency-free so it can be emitted as a standalone file.
const DEVTOOLS_TO_CLIENT = "preact-devtools-to-client";
const DEVTOOL_EVENT_TYPE = "PreactDevtools";
const PORT_POLL_INTERVAL = 100;
const PORT_POLL_ATTEMPTS = 50;

interface DevtoolPayload {
	source: string;
	type: string;
	data: unknown;
}

function bridgePort(port: MessagePort) {
	port.onmessage = (ev: MessageEvent) => {
		const { type, data } = (ev.data ?? {}) as { type?: string; data?: string };
		if (type !== DEVTOOL_EVENT_TYPE || typeof data !== "string") return;
		// worker client -> extension (payload already carries
		// `source: 'preact-page-hook'`)
		try {
			window.postMessage(JSON.parse(data), "*");
		} catch {
			// Malformed payloads must not break the page.
		}
	};
	window.addEventListener("message", e => {
		// extension -> worker client
		if (
			e.source === window &&
			e.data &&
			(e.data as DevtoolPayload).source === DEVTOOLS_TO_CLIENT
		) {
			port.postMessage({
				type: DEVTOOL_EVENT_TYPE,
				data: JSON.stringify(e.data),
			});
		}
	});
}

const bridgedChannels = new Set<string>();

function bridgeBroadcastChannelFallback(channelName: string) {
	if (bridgedChannels.has(channelName)) return;
	bridgedChannels.add(channelName);
	const channel = new BroadcastChannel(channelName);
	channel.onmessage = e => {
		window.postMessage(e.data, "*");
	};
	window.addEventListener("message", e => {
		if (
			e.source === window &&
			e.data &&
			(e.data as DevtoolPayload).source === DEVTOOLS_TO_CLIENT
		) {
			channel.postMessage(e.data);
		}
	});
}

// The client scopes its fallback channel via
// `globalProps.preactDevtoolsChannel` when the host provides one.
function fallbackChannelNameOf(view: Element): string {
	try {
		const raw = view.getAttribute("global-props");
		const name = raw && JSON.parse(raw)?.preactDevtoolsChannel;
		if (typeof name === "string" && name) return name;
	} catch {
		// fall through to the default channel
	}
	return "preact-devtools";
}

const bridgedViews = new WeakSet<Element>();

function attachToView(view: Element) {
	if (bridgedViews.has(view)) return;
	bridgedViews.add(view);

	let attempts = 0;
	const tryAttach = () => {
		// Available once the card has started rendering.
		const port = (view as { devtoolMessagePort?: MessagePort })
			.devtoolMessagePort;
		if (port) {
			bridgePort(port);
			return;
		}
		if (!view.isConnected) return;
		if (++attempts < PORT_POLL_ATTEMPTS) {
			setTimeout(tryAttach, PORT_POLL_INTERVAL);
			return;
		}
		// Older web-core without the devtool port: fall back to the client's
		// BroadcastChannel transport.
		bridgeBroadcastChannelFallback(fallbackChannelNameOf(view));
	};
	tryAttach();
}

function scan(root: ParentNode) {
	root.querySelectorAll("lynx-view").forEach(attachToView);
}

scan(document);
new MutationObserver(mutations => {
	for (const mutation of mutations) {
		for (const node of mutation.addedNodes) {
			if (!(node instanceof Element)) continue;
			if (node.tagName === "LYNX-VIEW") attachToView(node);
			else scan(node);
		}
	}
}).observe(document.documentElement, { childList: true, subtree: true });

export {};
