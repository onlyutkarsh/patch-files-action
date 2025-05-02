import * as core from "@actions/core";
import * as patcher from "./patcher";
import { JsonPatcher } from "./JsonPatcher";
import {XmlPatcher} from "./XmlPatcher";

export async function run() {
	let failIfError = false;
	let failIfNoFilesPatched = false;

	try {
		const files = core.getInput("files", <core.InputOptions>{ required: true });
		const patchSyntax = core.getInput("patch-syntax", <core.InputOptions>{ required: true });
		const outputPatchedFile = core.getInput("output-patched-file") === "true";
		failIfError = core.getInput("fail-if-error") === "true";
		failIfNoFilesPatched = core.getInput("fail-if-no-files-patched") === "true";

    //split files to detect .xml and .json files
    const filesArray = files
      .split(/[\n,]+/)
      .map(file => file.trim())
      .filter(file => file); // Remove empty strings

    // filter xml files in different array and json files in different array
    const xmlFiles = filesArray.filter(file => file.endsWith(".xml"));
    const jsonFiles = filesArray.filter(file => file.endsWith(".json"));
    // merge array to comma separated string
    const xmlFilesString = xmlFiles.join(",");
    const jsonFilesString = jsonFiles.join(",");

    //parallelly patch xml and json files
    const xmlPatcher = new XmlPatcher();
    const jsonPatcher = new JsonPatcher();

		// const jsonPatcher = new JsonPatcher();
		await patcher.patchAsync(jsonPatcher, jsonFilesString, patchSyntax, outputPatchedFile, failIfNoFilesPatched, failIfError);

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
