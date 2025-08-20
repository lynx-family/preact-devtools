export function getUrl({
	editor,
	pathToSource,
}: {
	editor: string;
	pathToSource: string;
}) {
	// Fix https://github.com/microsoft/vscode/issues/197319
	if (pathToSource[0] === "/") {
		return `${editor}://file${pathToSource}`;
	}

	return `${editor}://file/${pathToSource}`;
}
