// Importing `@lynx-js/preact-devtools` is itself the opt-in: in development the
// module is always bundled, and in production `@lynx-js/react-alias-rsbuild-plugin`
// only keeps it (instead of aliasing it to `false`) when the `REACT_DEVTOOL`
// environment variable is set. So whenever this module actually runs, devtools
// is wanted — no extra build-time flag needed.
// Skip setup in test environment because `require` does not work
// in vitest esm env, and `lynx.getDevtool` is not mocked yet
if (process.env.NODE_ENV !== "test") {
	// Devtools must never crash the hosting app: a top-level throw here takes
	// the whole background chunk down with it. Keep every failure inside this
	// try/catch and degrade to a warning instead.
	try {
		// We cannot use dynamic import here because
		// dynamic import will generate a new lazy bundle
		// which is not what we needed
		const mod = require("./setup");
		const callSetup = (m: any) => {
			const setup = m?.setupReactLynx ?? m?.default?.setupReactLynx;
			if (typeof setup === "function") {
				setup();
			} else {
				console.warn(
					"[PREACT DEVTOOLS] unexpected setup module shape:",
					m && Object.keys(m),
				);
			}
		};
		if (mod && typeof mod.then === "function") {
			// When the app consumes ReactLynx as an *async* external bundle
			// (`@lynx-js/react/internal` mounted as a Promise — always the case on
			// the web platform, and opt-in on native Lynx), `./setup` becomes an
			// async module, so a CJS require() yields a Promise of the namespace
			// instead of the namespace itself. Await it — calling
			// `.setupReactLynx()` directly on the Promise is what crashed the
			// whole background chunk.
			mod.then(callSetup, (e: unknown) => {
				console.warn("[PREACT DEVTOOLS] Devtools failed to initialize:");
				console.warn(e);
			});
		} else {
			callSetup(mod);
		}
	} catch (e) {
		console.warn("[PREACT DEVTOOLS] Devtools failed to initialize:");
		console.warn(e);
	}
}
