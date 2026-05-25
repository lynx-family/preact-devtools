import { defineConfig } from "vitest/config";

// Runs the same unit suite as `vitest.config.ts`, but inside the ReactLynx
// runtime emulated by `@lynx-js/testing-environment` instead of plain jsdom.
export default defineConfig({
	define: {
		__DEBUG__: "false",
	},
	oxc: {
		jsx: {
			importSource: "preact",
		},
	},
	test: {
		include: ["src/**/*.test.{ts,tsx}"],
		environment: "node",
		globals: true,
		setupFiles: ["./tools/vitest-setup-lynx.ts"],
	},
});
