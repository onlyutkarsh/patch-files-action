import * as core from "@actions/core";
import * as patcher from "./patcher";
import { JsonPatcher } from "./JsonPatcher";

export async function run() {
	let failIfError = false;
	let failIfNoFilesPatched = false;

	try {
		const files = core.getInput("files", <core.InputOptions>{ required: true });
		const patchSyntax = core.getInput("patch-syntax", <core.InputOptions>{ required: true });
		const outputPatchedFile = core.getInput("output-patched-file") === "true";
		failIfError = core.getInput("fail-if-error") === "true";
		failIfNoFilesPatched = core.getInput("fail-if-no-files-patched") === "true";

		const jsonPatcher = new JsonPatcher();

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
		if (failIfError || failIfNoFilesPatched) {
			core.setFailed(message);
		}
	}
}

run();
