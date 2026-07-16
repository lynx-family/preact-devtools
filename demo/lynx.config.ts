import { defineConfig } from "@lynx-js/rspeedy";

import { pluginQRCode } from "@lynx-js/qrcode-rsbuild-plugin";
import { pluginReactLynx } from "@lynx-js/react-rsbuild-plugin";

export default defineConfig({
	// output: {
	//   filenameHash: 'contenthash:8',
	//   minify: false,
	// },
	source: {
		define: {
			"globalThis.preactDevtoolsCtx.__DEBUG__": "true",
		},
	},
	plugins: [
		pluginQRCode({
			schema(url) {
				// We use `?fullscreen=true` to open the page in LynxExplorer in full screen mode
				return `${url}?fullscreen=true`;
			},
		}),
		pluginReactLynx({
			enableRemoveCSSScope: false,
		}),
	],
	environments: {
		// Native Lynx bundle (`main.lynx.bundle`, open with LynxExplorer).
		lynx: {},
		// Web platform bundle (`main.web.bundle`, decodable by `@lynx-js/web-core`).
		// Serve it in a real browser with `npm run dev:web`.
		// NOTE: the top-level `output.minify: false` below does not reach the
		// web bundle (verified on rspeedy 0.15 and 0.16: the web output stays
		// minified without this per-environment override — likely an
		// inheritance gap in the web environment's encode pipeline).
		web: {
			output: {
				minify: false,
			},
		},
	},
	output: {
		// Keep the demo bundles readable for debugging; size is irrelevant here.
		minify: false,
	},
});
