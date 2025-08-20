import { Source } from "../../../../adapter/adapter/adapter";
import { PathModifier } from "./types";

/**
 * @param {Source} source
 * @param {PathModifier} [pathModifier]
 */
export function getPathToSource(source: Source, pathModifier?: PathModifier) {
	const {
		// It _does_ exist!
		// @ts-ignore Property 'columnNumber' does not exist on type 'Source'.ts(2339)
		columnNumber = 1,
		fileName,
		lineNumber = 1,
	} = source;

	let path = `${fileName}:${lineNumber}:${columnNumber}`;
	if (pathModifier) {
		path = pathModifier(path);
	}

	return path;
}
