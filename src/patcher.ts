import XRegExp, { MatchArray } from "xregexp";
import { Operation } from "fast-json-patch";
import * as glob from "@actions/glob";
import * as core from "@actions/core";
import * as bom from "../src/bom";
import * as fs from "fs";

export interface IPatcher {
    apply(content: string, patchSyntax: string): string;
}

export interface IPatch {
    operation: string;
    path: string;
    value?: string;
    from?: string;
}

export async function globFilesAsync(patterns: string, followSymbolicLinks: string = "true"): Promise<glob.Globber> {
    const globOptions = {
        followSymbolicLinks: followSymbolicLinks.toUpperCase() !== "FALSE"
    };

    let globber = await glob.create(patterns, globOptions);
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

export async function patchAsync(patcher: IPatcher, filePattern: string[], patchSyntax: string[], followSymbolicLinks: string = "true") {

    let globber = await globFilesAsync(filePattern.join("\n"), followSymbolicLinks);

    for await (const file of globber.globGenerator()) {
        let fileExtension = file.slice((file.lastIndexOf(".") - 1 >>> 0) + 2);

        core.info(`Patching file ${file}`);
        let fileContent = bom.removeBom(fs.readFileSync(file, { encoding: "utf8" }));

        try {
            fileContent.content = patcher.apply(fileContent.content, patchSyntax.join("\n"));
            core.info(`${file} is successfully patched`);
        } catch (error) {
            //! COLLATE ERRORS AND REPORT ONCE
        }

    }
}

export function parsePatchSyntax(patchSyntax: string): Operation[] {
    var result: Operation[] = [];

    XRegExp.forEach(
        patchSyntax,
        XRegExp(
            "^\\s*(?<op>\\+|-|=|&|>|\\?)\\s*(?<path>.*?)\\s*(=>\\s*(?<value>.*))?$",
            "gm"
        ),
        match => {
            var op = (<any>match).op;
            if (op === "+") {
                result.push({
                    op: "add",
                    path: (<any>match).path,
                    value: parseValue(match)
                });
            } else if (op === "-") {
                result.push({
                    op: "remove",
                    path: (<any>match).path
                });
            } else if (op === "=") {
                result.push({
                    op: "replace",
                    path: (<any>match).path,
                    value: parseValue(match)
                });
            } else if (op === "&") {
                result.push({
                    op: "copy",
                    path: (<any>match).value,
                    from: (<any>match).path
                });
            } else if (op === ">") {
                result.push({
                    op: "move",
                    path: (<any>match).value,
                    from: (<any>match).path
                });
            } else if (op === "?") {
                result.push({
                    op: "test",
                    path: (<any>match).path,
                    value: parseValue(match)
                });
            } else {
                throw new Error("operator " + op + " is no supported.");
            }
        }
    );

    return result;
}

function parseValue(match: MatchArray): any {
    try {
        return JSON.parse((<any>match).value);
    } catch (error) {
        throw new Error(
            "Failed to parse value at line " +
            String(match.index) +
            ": `" +
            match.input +
            "`, " +
            String(error)
        );
    }
}