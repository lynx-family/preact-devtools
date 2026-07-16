// Keep in sync with `src/constants.ts`; dependency-free so tsc emits a
// standalone file.
const DEVTOOLS_TO_CLIENT = "preact-devtools-to-client";

interface DevtoolPayload {
	source: string;
	type: string;
	data: unknown;
}

const bridgedChannels = new Set<string>();

function bridgeBroadcastChannel(channelName: string) {
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

function channelNameOf(view: Element): string {
	try {
		const raw = view.getAttribute("global-props");
		const name = raw && JSON.parse(raw)?.preactDevtoolsChannel;
		if (typeof name === "string" && name) return name;
	} catch {}
	return "preact-devtools";
}

function attachToView(view: Element) {
	bridgeBroadcastChannel(channelNameOf(view));
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
