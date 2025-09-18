import { test, expect } from "@playwright/test";
import { getHooks, gotoTest, locateTreeItem } from "../../pw-utils";

test.skip("Show custom debug value complex", async ({ page }) => {
	const { devtools } = await gotoTest(page, "hooks-debug");

	await devtools.locator(locateTreeItem("App")).click();
	await devtools.locator('[data-testid="Hooks"]').waitFor();

	const hooks = await getHooks(devtools);
	expect(hooks).toEqual([["useFoo", '{foo: "bar"}']]);
});
