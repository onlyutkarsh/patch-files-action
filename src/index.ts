import core from "@actions/core";
import glob from "@actions/glob";
import { patchFiles, globFiles } from "./patchfiles";

async function run() {
    try {
        let pattern = core.getInput("files", { required: true });
        let globber = await globFiles(pattern);
        for await (const file of globber.globGenerator()) {
            core.info(file);
        }
    } catch (error) {
        core.setFailed(error.message);
    }
}

run();