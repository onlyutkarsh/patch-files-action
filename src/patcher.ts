import * as fs from "node:fs";
import * as core from "@actions/core";
import * as glob from "@actions/glob";
import type * as fjp from "fast-json-patch";
import type { Operation } from "fast-json-patch";
import * as bom from "../src/bom";

export interface IPatcher {
	apply(content: string, patchSyntax: fjp.Operation[]): string;
}

export interface IPatch {
	operation: string;
	path: string;
	value?: string;
	from?: string;
}

export async function globFilesAsync(patterns: string, followSymbolicLinks = "true"): Promise<glob.Globber> {
	const globOptions = {
		followSymbolicLinks: followSymbolicLinks.toUpperCase() !== "FALSE",
	};

	const globber = await glob.create(patterns, globOptions);
	return globber;
}

export function stringify(operation: Operation): string {
	switch (operation.op) {
		case "add":
			return `+ ${operation.path} => ${JSON.stringify(operation.value)}`;
		case "remove":
			return `- ${operation.path}`;
		case "replace":
			return `= ${operation.path} => ${JSON.stringify(operation.value)}`;
		case "copy":
			return `+ ${operation.from} => ${operation.path}`;
		case "move":
			return `+ ${operation.from} => ${operation.path}`;
		case "test":
			return `+ ${operation.path} => ${JSON.stringify(operation.value)}`;
		default:
			return "Unknown operation";
	}
}

export async function patchAsync(
	patcher: IPatcher,
	filePattern: string,
	patchSyntax: string,
	outputPatchedFile: boolean,
	failIfNoFilesPatched: boolean,
	_failIfError: boolean,
	followSymbolicLinks = "true",
): Promise<boolean> {
	const globber = await globFilesAsync(filePattern, followSymbolicLinks);

	const patches = parsePatchSyntax(patchSyntax);

	let filesPatched = 0;
	for await (const file of globber.globGenerator()) {
		core.info(`Patching file ${file}`);
		const fileContent = bom.removeBom(fs.readFileSync(file, { encoding: "utf8" }));

		try {
			fileContent.content = patcher.apply(fileContent.content, patches);
			core.info(`${file} is successfully patched`);

			if (outputPatchedFile) {
				core.info("===Patched file content===");
				core.info(fileContent.content);
			}

			fs.writeFileSync(file, bom.restoreBom(fileContent), { encoding: "utf8" });

			filesPatched++;
		} catch (error) {
			throw new Error(`Error patching file:\n${error}`);
		}
	}
	if (failIfNoFilesPatched && filesPatched === 0) {
		throw new Error("No files were patched");
	}
	return filesPatched > 0;
}

export function parsePatchSyntax(patchSyntax: string): Operation[] {
	const result: Operation[] = [];

	const regex = /^\s*(?<op>\+|-|=|&|>|\?)\s*(?<path>.*?)\s*(=>\s*(?<value>.*))?$/;
	const lines = patchSyntax.split("\n");

	for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
		const line = lines[lineIndex].trim();

		// Skip empty lines and comments
		if (line === "" || line.startsWith("#") || line.startsWith("//")) {
			continue;
		}

		const match = line.match(regex);

		if (!match || !match.groups) {
			throw new Error(
				`Unable to parse patch syntax at line ${lineIndex + 1}: '${line}'. Expected format: '<op> <path> => <value>' where op is one of +, -, =. Use # or // for comments.`,
			);
		}

		const op = match.groups.op; // +, -, =, &, >, ?
		const path = match.groups.path;
		const value = match.groups.value;
		switch (op) {
			case "+":
				result.push({
					op: "add",
					path: path,
					value: parseValue(value),
				});
				break;
			case "-":
				result.push({
					op: "remove",
					path: path,
				});
				break;
			case "=":
				result.push({
					op: "replace",
					path: path,
					value: parseValue(value),
				});
				break;
			default:
				throw new Error(`Operator '${op}' is not supported.`);
		}
	}

	for (let index = 0; index < result.length; index++) {
		const patch = result[index];
		if (patch.path && patch.path[0] !== "/") {
			throw new Error(
				`Path should start with a leading slash. Please verify path '${patch.path}' at index: '${index}'`,
			);
		}
	}

	return result;
}

function parseValue(value: string): string {
	try {
		return JSON.parse(value);
	} catch (error) {
		throw new Error(`Failed to parse value at line '${value}', ${error}`);
	}
}
