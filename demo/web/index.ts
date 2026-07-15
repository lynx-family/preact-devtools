import "@lynx-js/web-elements/index.css";
import "@lynx-js/web-core/client";

// Preact Devtools bridge: on the web platform the ReactLynx client in the
// background worker transports devtools protocol messages over a same-origin
// BroadcastChannel. Relay them to/from window messages so the official Preact
// Devtools browser extension (content-script protocol) picks them up.
//
// BroadcastChannel broadcasts across the whole origin, so scope the channel to
// this page (passed to the client via lynx-view globalProps) — otherwise two
// open tabs of this demo would relay each other's trees into both panels.
const devtoolsChannelName = `preact-devtools-${Math.random()
	.toString(36)
	.slice(2)}`;
const devtoolsChannel = new BroadcastChannel(devtoolsChannelName);
devtoolsChannel.onmessage = e => {
	// worker client -> extension (messages already carry `source: 'preact-page-hook'`)
	window.postMessage(e.data, "*");
};
window.addEventListener("message", e => {
	// extension -> worker client
	if (
		e.source === window &&
		e.data &&
		e.data.source === "preact-devtools-to-client"
	) {
		devtoolsChannel.postMessage(e.data);
	}
});

const view = document.createElement("lynx-view");
view.setAttribute("url", "/main.web.bundle");
view.setAttribute(
	"global-props",
	JSON.stringify({ preactDevtoolsChannel: devtoolsChannelName }),
);
view.style.cssText = "display:block;width:100vw;height:100vh";
document.body.append(view);
