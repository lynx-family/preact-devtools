import "@lynx-js/web-elements/index.css";
import "@lynx-js/web-core/client";
import "@lynx-js/preact-devtools/web-host";

const devtoolsChannelName = `preact-devtools-${Math.random()
	.toString(36)
	.slice(2)}`;

const view = document.createElement("lynx-view");
view.setAttribute("url", "/main.web.bundle");
view.setAttribute(
	"global-props",
	JSON.stringify({ preactDevtoolsChannel: devtoolsChannelName }),
);
view.style.cssText = "display:block;width:100vw;height:100vh";
document.body.append(view);
