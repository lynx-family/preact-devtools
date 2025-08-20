window.preactDevtoolsLDTCtx = window;
window.preactDevtoolsLDTCtx.devtoolsProps = {
	addEventListener,
	postMessage: (...args) => {
		// skip "Page.reload"
		if (args[0] === "Remote.Customized.CDP") {
			return;
		}
		window.postMessage(...args);
	},
	isOSSLynxDevtool: true,
	addOnScreenCastPanelUINodeIdSelectedListener: () => {},
	onPreactDevtoolsPanelUINodeIdSelected: () => {},
};
