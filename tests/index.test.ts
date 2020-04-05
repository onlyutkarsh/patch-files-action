import fs from "fs";
import * as patcher from "../src/patcher";
import { JsonPatcher } from "../src/JsonPatcher";
import * as index from "../src/index";
import * as core from "@actions/core";
import * as bom from "../src/bom";

jest.mock("@actions/core");

let inputJson = {
    "version": "1.0.0",
    "keywords": [],
    "author": "onlyutkarsh",
    "bugs": {
        "url": "http://www.dummy.com"
    }
};

describe("index.ts tests", () => {
    beforeEach(async () => {
        fs.mkdirSync("temp");

        fs.writeFileSync("temp/test.json", JSON.stringify(inputJson));
    });

    afterEach(async () => {
        fs.rmdirSync("temp", { recursive: true });

        jest.restoreAllMocks();
    });

    test("validate all inputs are read correctly", async () => {
        //mock core.getInput
        const inputSpy = jest.spyOn(core, "getInput");

        await index.run();
        expect(inputSpy).toHaveBeenCalledWith("files", { "required": true });
        expect(inputSpy).toHaveBeenCalledWith("patch-syntax", { "required": true });
        expect(inputSpy).toHaveBeenCalledWith("output-patched-file");
        expect(inputSpy).toHaveBeenCalledWith("fail-if-no-files-patched");
        expect(inputSpy).toHaveBeenCalledWith("fail-if-error");
    });

    test("find matching files in a directory should return one file", async () => {
        let pattern = ["temp/*.json"];
        let files = pattern.join("\n");
        let globber = await patcher.globFilesAsync(files);
        let paths = await globber.glob();
        expect(paths.length).toEqual(1);
    });

    test("parse patch syntax and validate its json-patch compatible", async () => {

        let patchSyntax = [
            "= /version => \"1.0.1\"",
            "= /author => \"utkarsh\"",
            "+ /bugs/name => \"Google\"",
            "= /bugs/url => \"https://www.google.com\""
        ];

        let operation = patcher.parsePatchSyntax(patchSyntax.join("\n"));

        expect(operation.length).toEqual(4);
    });

    test("patch syntax with no leading / in path should throw exception if failIfError = true", async () => {

        jest.spyOn(core, "getInput").mockImplementation((name, options) => {
            switch (name) {
                case "files": return ["temp/*.nonexistent"]
                    .join("\n");
                case "patch-syntax":
                    return [
                        "= version => \"1.0.1\"",
                    ].join("\n");
                case "fail-if-error": return "true"; //should throw if true
                case "fail-if-no-files-patched": return "false";
            }
            return "";
        });

        let setFaledSpy = jest.spyOn(core, "setFailed");

        await index.run();

        expect(setFaledSpy).toHaveBeenCalledWith("Path should start with a leading slash. Please verify path 'version' at index: '0'");

    });

    test("patch syntax with no leading / in path should *NOT* throw exception if failIfError = false", async () => {

        jest.spyOn(core, "getInput").mockImplementation((name, options) => {
            switch (name) {
                case "files": return ["temp/*.nonexistent"]
                    .join("\n");
                case "patch-syntax":
                    return [
                        "= version => \"1.0.1\"",
                    ].join("\n");
                case "fail-if-error": return "false"; //should throw if true
                case "fail-if-no-files-patched": return "false";
            }
            return "";
        });

        let setFaledSpy = jest.spyOn(core, "setFailed");

        await index.run();

        expect(setFaledSpy).not.toHaveBeenCalledWith();

    });

    test("invalid operator in patch syntax should throw exception if failIfError = true", async () => {
        jest.spyOn(core, "getInput").mockImplementation((name, options) => {
            switch (name) {
                case "files": return ["temp/*.nonexistent"]
                    .join("\n");
                case "patch-syntax":
                    return [
                        "& /version => \"1.0.1\"", //"Operator '&' is no supported."
                    ].join("\n");
                case "output-patched-file": return "true";
                case "fail-if-error": return "true";
                case "fail-if-no-files-patched": return "false";
            }
            return "";
        });

        let setFaledSpy = jest.spyOn(core, "setFailed");

        await index.run();

        expect(setFaledSpy).toHaveBeenCalledWith("Operator '&' is no supported.");
    });

    test("invalid operator in patch syntax should *NOT* throw exception if failIfError = false", async () => {
        jest.spyOn(core, "getInput").mockImplementation((name, options) => {
            switch (name) {
                case "files": return ["temp/*.nonexistent"]
                    .join("\n");
                case "patch-syntax":
                    return [
                        "& /version => \"1.0.1\"", //"Operator '&' is no supported."
                    ].join("\n");
                case "output-patched-file": return "true";
                case "fail-if-error": return "false";
                case "fail-if-no-files-patched": return "false";
            }
            return "";
        });

        let setFaledSpy = jest.spyOn(core, "setFailed");

        await index.run();

        expect(setFaledSpy).not.toHaveBeenCalledWith();
    });

    test("should throw exception if failIfNoFilesPatched = true and filesPatched = 0, it should ignore failIfError value", async () => {
        jest.spyOn(core, "getInput").mockImplementation((name, options) => {
            switch (name) {
                case "files": return ["temp/*.nonexistent"]
                    .join("\n");
                case "patch-syntax":
                    return [
                        "= /version => \"1.0.1\"",
                        "= /author => \"utkarsh\"",
                        "+ /bugs/name => \"Google\"",
                        "= /bugs/url => \"https://www.google.com\""
                    ].join("\n");
                case "output-patched-file": return "false";
                case "fail-if-error": return "false";
                case "fail-if-no-files-patched": return "true"; //for throw error if set to true
            }
            return "";
        });

        let setFaledSpy = jest.spyOn(core, "setFailed");

        await index.run();

        expect(setFaledSpy).toHaveBeenCalledWith("No files were patched");

    });

    test("should *NOT* throw exception if failIfNoFilesPatched = false, failIfError=false and filesPatched = 0", async () => {
        jest.spyOn(core, "getInput").mockImplementation((name, options) => {
            switch (name) {
                case "files": return ["temp/*.nonexistent"]
                    .join("\n");
                case "patch-syntax":
                    return [
                        "= /version => \"1.0.1\"",
                        "= /author => \"utkarsh\"",
                        "+ /bugs/name => \"Google\"",
                        "= /bugs/url => \"https://www.google.com\""
                    ].join("\n");
                case "output-patched-file": return "false";
                case "fail-if-error": return "false";
                case "fail-if-no-files-patched": return "false"; //for throw error if set to true
            }
            return "";
        });

        let setFaledSpy = jest.spyOn(core, "setFailed");

        await index.run();

        expect(setFaledSpy).not.toHaveBeenCalledWith();

    });

    test("apply patch and validate json", () => {

        let patchSyntax = [
            "= /version => \"1.0.1\"",
            "= /author => \"Utkarsh Shigihalli\"",
            "+ /bugs/name => \"Google\"",
            "= /bugs/url => \"https://www.google.com\""
        ];

        let operation = patcher.parsePatchSyntax(patchSyntax.join("\n"));
        let fileContent = bom.removeBom(fs.readFileSync("temp/test.json", { encoding: "utf8" }));

        let jp = new JsonPatcher();
        let response = jp.apply(fileContent.content, operation);

        let expectedResponse = {
            "version": "1.0.1",
            "keywords": [],
            "author": "Utkarsh Shigihalli",
            "bugs": {
                "url": "https://www.google.com",
                "name": "Google"
            }
        };

        expect(response).toEqual(JSON.stringify(expectedResponse));

    });

    test("add multiple elements to file", async () => {

    });

    test("replace multiple tokens in file", async () => {
    });

    test("remove single token in file", async () => {

    });

    test("remove multiple tokens in file", async () => {

    });
});