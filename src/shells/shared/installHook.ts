// Note: This file will be inlined into `content-script.ts`
// when building the extension.

import { createHook } from "../../adapter/hook";
import { createPortForHook } from "../../adapter/adapter/port";

// The hook lives on the per-card devtools ctx (never on globalThis, which is
// shared across cards in Lynx's shared-context mode). In browser shells the
// ctx is `window` itself, so the standard discovery location still works.
lynx.preactDevtoolsCtx.__PREACT_DEVTOOLS__ = createHook(
	createPortForHook(lynx.preactDevtoolsCtx),
);
