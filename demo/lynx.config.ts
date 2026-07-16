import { defineConfig } from "@lynx-js/rspeedy";

import { pluginQRCode } from "@lynx-js/qrcode-rsbuild-plugin";
import { pluginReactLynx } from "@lynx-js/react-rsbuild-plugin";

// Set NO_MINIFY=1 to build readable bundles for debugging.
const noMinify = !!process.env.NO_MINIFY;

export default defineConfig({
	// output: {
	//   filenameHash: 'contenthash:8',
	//   minify: false,
	// },
	source: {
		define: {
			"lynx.preactDevtoolsCtx.__DEBUG__": "true",
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
		lynx: {},
		// The top-level `output.minify` does not reach the web bundle.
		web: noMinify ? { output: { minify: false } } : {},
	},
	output: noMinify ? { minify: false } : {},
});
