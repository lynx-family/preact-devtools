// Note: This file will be inlined into `content-script.ts`
// when building the extension.

import { createHook } from "../../adapter/hook";
import { createPortForHook } from "../../adapter/adapter/port";

const hook = createHook(createPortForHook(lynx.preactDevtoolsCtx));
// `preact/devtools` discovers the hook on globalThis; adapter code reads it
// through the ctx shim (its `window`), which must therefore carry it too.
(globalThis as any).__PREACT_DEVTOOLS__ = hook;
lynx.preactDevtoolsCtx.__PREACT_DEVTOOLS__ = hook;
