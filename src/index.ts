import * as core from "@actions/core";
import * as glob from "@actions/glob";
import { patchFiles, globFiles } from "./patchfiles";

async function run() {
    try {
        let pattern = core.getInput("files", { required: true });
        let globber = await globFiles(pattern);
        let files = await globber.glob();
        core.info(JSON.stringify(files));
    } catch (error) {
        core.setFailed(error.message);
    }
}

run();