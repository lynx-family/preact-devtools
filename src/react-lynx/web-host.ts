// Keep in sync with `src/constants.ts`; dependency-free so tsc emits a
// standalone file.
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
		try {
			window.postMessage(JSON.parse(data), "*");
		} catch {}
	};
	window.addEventListener("message", e => {
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
