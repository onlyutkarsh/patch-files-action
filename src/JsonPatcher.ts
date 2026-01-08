import * as patcher from "./patcher";
import * as fjp from "fast-json-patch";
import * as core from "@actions/core";

export class JsonPatcher implements patcher.IPatcher {
    apply(content: string, patchContent: fjp.Operation[]): string {

        const json = JSON.parse(content);

        const patchError = fjp.validate(patchContent, json);

        if (patchError) {
            core.warning(`Invalid patch at index '${patchError.index}'`);
            core.warning(patcher.stringify(patchError.operation));
            core.warning(`${patchError.name}\n${patchError.message}`);
            throw new Error(`Invalid patch at index '${patchError.index}': ${patchError.name}, ${patchError.message}`);
        }

        const result = fjp.applyPatch(json, patchContent);
        if (result) {
            // Detect indentation from original content for consistent formatting
            const indentMatch = content.match(/^{\n( +)/);
            const indent = indentMatch ? indentMatch[1].length : 2;
            return JSON.stringify(json, null, indent);
        }
        else {
            throw new Error("Failed to apply patch");
        }
    }
}
