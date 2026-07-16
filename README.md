# Preact Devtools for ReactLynx

The [Lynx Devtool](https://github.com/lynx-family/lynx-devtool) Panel that allows you to inspect a ReactLynx component hierarchy, including props and state.

## Usage

We need to import `@lynx-js/preact-devtools` somewhere to initialize the connection
to Preact Devtools Panel. Make sure that this import is **the first** import in your
whole app.

```bash
import '@lynx-js/preact-devtools'
```

See the documentation of [Preact Devtools Panel in Lynx Devtool](https://lynxjs.org/guide/devtool/panels/preact-devtools-panel.html#preact-devtools-panel) for more information.

### Web platform

On native Lynx the client talks to the devtools panel over the CDP channel exposed by
`lynx.getDevtool()`. On the [web platform](https://lynxjs.org/guide/start/fragments/web/platform-reminder.html)
there is no `getDevtool()`; the client instead transports the same protocol over a
same-origin `BroadcastChannel` named `preact-devtools`, which the background worker
shares with the hosting page. The same `import '@lynx-js/preact-devtools'` opt-in
applies (set `REACT_DEVTOOL=1` to keep it in production builds).

A `BroadcastChannel` broadcasts across the whole origin, so two tabs (or two
`lynx-view`s) debugged at once would cross-talk on the default name. The host can
scope the channel per view by passing a unique name through globalProps — the
client picks up `globalProps.preactDevtoolsChannel` when present:

```js
view.setAttribute(
	"global-props",
	JSON.stringify({ preactDevtoolsChannel: `preact-devtools-${myViewId}` }),
);
```

To reuse the official
[Preact Devtools browser extension](https://chromewebstore.google.com/detail/preact-developer-tools/ilcajpmogmhpliinlbcdebhbcanbghmd),
import the bundled host bridge once in the hosting page — it discovers every
`lynx-view` and relays its devtools protocol to the extension:

```js
import "@lynx-js/preact-devtools/web-host";
```

The bridge joins the client's `BroadcastChannel` transport, honoring the
per-view channel scoping described above.

With the bridge in place the extension icon reports the page as using Preact and
the `Preact` tab in the browser devtools inspects the ReactLynx app running in the
worker.

Try it locally: `npm run dev:web` inside [`demo/`](./demo/) builds the demo as a
`main.web.bundle` and serves it in a real browser with this bridge preinstalled.

## Contributing

- [`ldt-plugin`](./ldt-plugin/) contains the source code of Preact Devtools Panel in Lynx Devtool. Run it by `npm run dev:ldt-plugin` when developing, and `npm run build:ldt-plugin` to build it.
- [`src`](./src/) contains the source code for ReactLynx App to setup Preact Devtools related hooks. You can build it just by `npm run build:lib` in the root folder of this repository.

The ReactLynx App will communicate with the Preact Devtools Panel in Lynx Devtool using CDP messages.

## Credits

Thanks to:

- [Preact Devtools](https://github.com/preactjs/preact-devtools) for the original Devtools implementation for Preact.
