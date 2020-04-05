import * as core from "@actions/core";
import * as glob from "@actions/glob";
import * as patcher from "./patcher";
import { JsonPatcher } from "./JsonPatcher";

export async function run() {
	try {
		let files = core.getInput("files", <core.InputOptions>{ required: true });
		let patchSyntax = core.getInput("patch-syntax", <core.InputOptions>{ required: true });
		let outputPatchedFile = core.getInput("output-patched-file") === "true";
		let failIfError = core.getInput("fail-if-error") === "true";
		let failIfNoFilesPatched = core.getInput("fail-if-no-files-patched") === "true";

		let jsonPatcher = new JsonPatcher();

		await patcher.patchAsync(jsonPatcher, files, patchSyntax, outputPatchedFile, failIfNoFilesPatched, failIfError);

	} catch (error) {
		let message = "";
		if (error instanceof Error) {
			message = error.message;
		}
		else {
			message = "Unknown error ocurred";
		}
		core.error(message);
		core.setFailed(message);
	}
}

run();
