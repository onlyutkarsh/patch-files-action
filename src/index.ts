import * as core from "@actions/core";
import * as glob from "@actions/glob";
import * as patcher from "./patcher";

export async function run() {
	try {
		let files = core.getInput("files", <core.InputOptions>{ required: true });
		let patchSyntax = core.getInput("patch-syntax", <core.InputOptions>{ required: true });
		let outputPatchedFile = core.getInput("output-patched-file") || false;
		let failIfError = core.getInput("fail-if-error") || true;
		let failIfNoFilesPatched = core.getInput("fail-if-no-files-patched") || true;

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
