import * as core from "@actions/core";
import { patchFiles, findFilesInDir } from "./patchfiles";

function getInputFiles(): string[] {
    const files = core.getInput("files", {
        required: true
    }) || "";

    if (files.trim().startsWith("[")) {
        return JSON.parse(files);
    }

    return [files];
}

async function run() {
    try {
        let files = getInputFiles();
        files = Array.isArray(files) ? files : [files];
        let paths = await findFilesInDir(["./temp/*.json"]);
        let result = patchFiles(files, "");
    } catch (error) {
        core.setFailed(error.message);
    }
}

run();