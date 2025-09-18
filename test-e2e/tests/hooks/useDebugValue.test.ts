import { test, expect } from "@playwright/test";
import { getHooks, gotoTest, locateTreeItem } from "../../pw-utils";

test.skip("Show custom debug value", async ({ page }) => {
	const { devtools } = await gotoTest(page, "hooks");

	await devtools.locator(locateTreeItem("DebugValue")).click();
	await devtools.locator('[data-testid="Hooks"]').waitFor();

	let hooks = await getHooks(devtools);
	expect(hooks).toEqual([["useMyHook", '"Offline"']]);

	await page.locator('[data-testid="debug-hook-toggle"]').click();

	hooks = await getHooks(devtools);
	expect(hooks).toEqual([["useMyHook", '"Online"']]);
});
