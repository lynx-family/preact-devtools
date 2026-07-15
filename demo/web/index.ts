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

// The extension's content script only connects once it observes traffic, and
// the client only emits on renders — so if the extension attaches after the
// app booted and nothing re-renders, it would never connect. Nudge the client
// to re-announce shortly after load and whenever the tab regains focus.
const nudgeDevtoolsClient = () => {
	devtoolsChannel.postMessage({
		type: "refresh",
		source: "preact-devtools-to-client",
	});
};
setTimeout(nudgeDevtoolsClient, 1000);
window.addEventListener("focus", nudgeDevtoolsClient);

const view = document.createElement("lynx-view");
view.setAttribute("url", "/main.web.bundle");
view.style.cssText = "display:block;width:100vw;height:100vh";
document.body.append(view);
