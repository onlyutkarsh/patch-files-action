import * as core from "@actions/core";
import * as glob from "@actions/glob";
import * as patcher from "./patcher";

export async function run() {
    try {
        let files = core.getInput("files", { required: true });
        let patchSyntax = core.getInput("patch-syntax", { required: true });

        let temp = core.getInput("teno");
    } catch (error) {
        core.setFailed(error.message);
    }
}

run();