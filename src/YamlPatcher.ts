import * as core from "@actions/core";
import * as fjp from "fast-json-patch";
import * as yaml from "js-yaml";
import * as patcher from "./patcher";

interface FormatOptions {
	indent: number;
	newline: string;
}

export class YamlPatcher implements patcher.IPatcher {
	apply(content: string, patchContent: fjp.Operation[]): string {
		// Parse YAML to JavaScript object
		const data = yaml.load(content);

		// Validate the patch operations
		const patchError = fjp.validate(patchContent, data);

		if (patchError) {
			core.warning(`Invalid patch at index '${patchError.index}'`);
			core.warning(patcher.stringify(patchError.operation));
			core.warning(`${patchError.name}\n${patchError.message}`);
			throw new Error(`Invalid patch at index '${patchError.index}': ${patchError.name}, ${patchError.message}`);
		}

		// Apply the patch operations
		const result = fjp.applyPatch(data, patchContent);
		if (result) {
			const format = this.detectFormatting(content);

			// Dump back to YAML with detected formatting
			const stringified = yaml.dump(data, {
				indent: format.indent,
				lineWidth: -1, // Disable line wrapping
				noRefs: true, // Disable anchors and aliases
				sortKeys: false, // Preserve key order
			});

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
		// YAML typically uses consistent indentation
		const lines = content.split(/\r?\n/);
		let indent = 2; // Default to 2 spaces
		const indentLevels: number[] = [];

		for (const line of lines) {
			// Skip empty lines and comments
			if (line.trim() === "" || line.trim().startsWith("#")) {
				continue;
			}

			// Look for indented lines (starting with spaces)
			const match = line.match(/^( +)\S/);
			if (match) {
				indentLevels.push(match[1].length);
			}
		}

		// Find the greatest common divisor of indentation levels to determine indent size
		if (indentLevels.length > 0) {
			// Get the smallest non-zero indentation as the base
			const minIndent = Math.min(...indentLevels);
			if (minIndent > 0) {
				// Check if this is a consistent indent level by verifying all levels are multiples
				const isConsistent = indentLevels.every((level) => level % minIndent === 0);
				if (isConsistent) {
					indent = minIndent;
				}
			}
		}

		return { indent, newline };
	}
}
