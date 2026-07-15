import "@lynx-js/web-elements/index.css";
import "@lynx-js/web-core/client";

// Preact Devtools bridge: on the web platform the ReactLynx client in the
// background worker transports devtools protocol messages over a same-origin
// BroadcastChannel. Relay them to/from window messages so the official Preact
// Devtools browser extension (content-script protocol) picks them up.
const devtoolsChannel = new BroadcastChannel("preact-devtools");
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
view.style.cssText = "display:block;width:100vw;height:100vh";
document.body.append(view);
