import * as core from "@actions/core";
import * as fjp from "fast-json-patch";
import * as patcher from "./patcher";

interface FormatOptions {
	indent: string | number;
	newline: string;
}

export class JsonPatcher implements patcher.IPatcher {
	apply(content: string, patchContent: fjp.Operation[]): string {
		const json = JSON.parse(content);

		const patchError = fjp.validate(patchContent, json);

		if (patchError) {
			core.warning(`Invalid patch at index '${patchError.index}'`);
			core.warning(patcher.stringify(patchError.operation));
			core.warning(`${patchError.name}\n${patchError.message}`);
			throw new Error(`Invalid patch at index '${patchError.index}': ${patchError.name}, ${patchError.message}`);
		}

		const result = fjp.applyPatch(json, patchContent);
		if (result) {
			const format = this.detectFormatting(content);
			const stringified = JSON.stringify(json, null, format.indent);

			// If the original content used CRLF, convert LF to CRLF
			if (format.newline === "\r\n") {
				return stringified.replace(/\n/g, "\r\n");
			}

			return stringified;
		} else {
			throw new Error("Failed to apply patch");
		}
	}

	private detectFormatting(content: string): FormatOptions {
		// Detect newline style
		const newline = content.includes("\r\n") ? "\r\n" : "\n";

		// Detect indentation by looking for the first indented line
		// This works for both objects starting with { and arrays starting with [
		const indentMatch = content.match(/^[{[]\r?\n([ \t]+)/);

		if (indentMatch) {
			const indentStr = indentMatch[1];
			// If it's tabs, use tab character; otherwise use the number of spaces
			if (indentStr[0] === "\t") {
				return { indent: "\t", newline };
			} else {
				return { indent: indentStr.length, newline };
			}
		}

		// Fallback: default to 2 spaces if no indentation detected
		return { indent: 2, newline };
	}
}
