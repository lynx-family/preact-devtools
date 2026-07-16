import { defineConfig } from "@rsbuild/core";

// Browser host that serves the built `main.web.bundle` (in `dist/`) and
// mounts `<lynx-view>`. Run `npm run dev:web`.
export default defineConfig({
	source: {
		entry: {
			index: "./web/index.ts",
		},
	},
	server: {
		publicDir: [
			{
				name: "dist",
				copyOnBuild: false,
			},
		],
	},
});
