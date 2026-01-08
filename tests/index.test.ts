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
        fs.rmSync("temp", { recursive: true, force: true });

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

        expect(setFaledSpy).toHaveBeenCalledWith("Operator '&' is not supported.");
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

        // Parse both to compare the actual JSON structure, not formatting
        expect(JSON.parse(response)).toEqual(expectedResponse);

    });

    test("add multiple elements to file", () => {
        let patchSyntax = [
            "+ /license => \"MIT\"",
            "+ /repository => \"https://github.com/test/repo\"",
            "+ /bugs/email => \"bugs@example.com\""
        ];

        let operation = patcher.parsePatchSyntax(patchSyntax.join("\n"));
        let fileContent = bom.removeBom(fs.readFileSync("temp/test.json", { encoding: "utf8" }));

        let jp = new JsonPatcher();
        let response = jp.apply(fileContent.content, operation);
        let result = JSON.parse(response);

        expect(result.license).toEqual("MIT");
        expect(result.repository).toEqual("https://github.com/test/repo");
        expect(result.bugs.email).toEqual("bugs@example.com");
    });

    test("replace multiple tokens in file", () => {
        let patchSyntax = [
            "= /version => \"2.0.0\"",
            "= /author => \"Jane Doe\"",
            "= /bugs/url => \"https://newurl.com\""
        ];

        let operation = patcher.parsePatchSyntax(patchSyntax.join("\n"));
        let fileContent = bom.removeBom(fs.readFileSync("temp/test.json", { encoding: "utf8" }));

        let jp = new JsonPatcher();
        let response = jp.apply(fileContent.content, operation);
        let result = JSON.parse(response);

        expect(result.version).toEqual("2.0.0");
        expect(result.author).toEqual("Jane Doe");
        expect(result.bugs.url).toEqual("https://newurl.com");
    });

    test("remove single token in file", () => {
        let patchSyntax = [
            "- /author"
        ];

        let operation = patcher.parsePatchSyntax(patchSyntax.join("\n"));
        let fileContent = bom.removeBom(fs.readFileSync("temp/test.json", { encoding: "utf8" }));

        let jp = new JsonPatcher();
        let response = jp.apply(fileContent.content, operation);
        let result = JSON.parse(response);

        expect(result.author).toBeUndefined();
        expect(result.version).toEqual("1.0.0"); // other fields should remain
    });

    test("remove multiple tokens in file", () => {
        let patchSyntax = [
            "- /keywords",
            "- /bugs/url"
        ];

        let operation = patcher.parsePatchSyntax(patchSyntax.join("\n"));
        let fileContent = bom.removeBom(fs.readFileSync("temp/test.json", { encoding: "utf8" }));

        let jp = new JsonPatcher();
        let response = jp.apply(fileContent.content, operation);
        let result = JSON.parse(response);

        expect(result.keywords).toBeUndefined();
        expect(result.bugs.url).toBeUndefined();
        expect(result.version).toEqual("1.0.0"); // other fields should remain
    });

    test("handle array patching - add to array", () => {
        let patchSyntax = [
            "+ /keywords/0 => \"testing\"",
            "+ /keywords/1 => \"github-actions\""
        ];

        let operation = patcher.parsePatchSyntax(patchSyntax.join("\n"));
        let fileContent = bom.removeBom(fs.readFileSync("temp/test.json", { encoding: "utf8" }));

        let jp = new JsonPatcher();
        let response = jp.apply(fileContent.content, operation);
        let result = JSON.parse(response);

        expect(result.keywords).toContain("testing");
        expect(result.keywords).toContain("github-actions");
        expect(result.keywords.length).toEqual(2);
    });

    test("handle numeric values", () => {
        let patchSyntax = [
            "+ /downloads => 1000",
            "+ /rating => 4.5"
        ];

        let operation = patcher.parsePatchSyntax(patchSyntax.join("\n"));
        let fileContent = bom.removeBom(fs.readFileSync("temp/test.json", { encoding: "utf8" }));

        let jp = new JsonPatcher();
        let response = jp.apply(fileContent.content, operation);
        let result = JSON.parse(response);

        expect(result.downloads).toEqual(1000);
        expect(result.rating).toEqual(4.5);
    });

    test("handle boolean values", () => {
        let patchSyntax = [
            "+ /private => true",
            "+ /deprecated => false"
        ];

        let operation = patcher.parsePatchSyntax(patchSyntax.join("\n"));
        let fileContent = bom.removeBom(fs.readFileSync("temp/test.json", { encoding: "utf8" }));

        let jp = new JsonPatcher();
        let response = jp.apply(fileContent.content, operation);
        let result = JSON.parse(response);

        expect(result.private).toEqual(true);
        expect(result.deprecated).toEqual(false);
    });

    test("handle null values", () => {
        let patchSyntax = [
            "+ /homepage => null"
        ];

        let operation = patcher.parsePatchSyntax(patchSyntax.join("\n"));
        let fileContent = bom.removeBom(fs.readFileSync("temp/test.json", { encoding: "utf8" }));

        let jp = new JsonPatcher();
        let response = jp.apply(fileContent.content, operation);
        let result = JSON.parse(response);

        expect(result.homepage).toBeNull();
    });

    test("handle object values", () => {
        let patchSyntax = [
            '+ /config => {"timeout": 30, "retries": 3}'
        ];

        let operation = patcher.parsePatchSyntax(patchSyntax.join("\n"));
        let fileContent = bom.removeBom(fs.readFileSync("temp/test.json", { encoding: "utf8" }));

        let jp = new JsonPatcher();
        let response = jp.apply(fileContent.content, operation);
        let result = JSON.parse(response);

        expect(result.config).toEqual({ timeout: 30, retries: 3 });
    });

    test("handle array values", () => {
        let patchSyntax = [
            '= /keywords => ["test", "ci", "automation"]'
        ];

        let operation = patcher.parsePatchSyntax(patchSyntax.join("\n"));
        let fileContent = bom.removeBom(fs.readFileSync("temp/test.json", { encoding: "utf8" }));

        let jp = new JsonPatcher();
        let response = jp.apply(fileContent.content, operation);
        let result = JSON.parse(response);

        expect(result.keywords).toEqual(["test", "ci", "automation"]);
    });

    test("handle deep nested paths", () => {
        let patchSyntax = [
            '+ /bugs/contact => {}',
            '+ /bugs/contact/email => "support@example.com"',
            '+ /bugs/contact/phone => "+1234567890"'
        ];

        let operation = patcher.parsePatchSyntax(patchSyntax.join("\n"));
        let fileContent = bom.removeBom(fs.readFileSync("temp/test.json", { encoding: "utf8" }));

        let jp = new JsonPatcher();
        let response = jp.apply(fileContent.content, operation);
        let result = JSON.parse(response);

        expect(result.bugs.contact.email).toEqual("support@example.com");
        expect(result.bugs.contact.phone).toEqual("+1234567890");
    });

    test("handle BOM preservation", () => {
        const contentWithBOM = "\uFEFF" + JSON.stringify(inputJson);
        fs.writeFileSync("temp/bom-test.json", contentWithBOM, { encoding: "utf8" });

        let patchSyntax = [
            '= /version => "2.0.0"'
        ];

        let operation = patcher.parsePatchSyntax(patchSyntax.join("\n"));
        let fileContent = bom.removeBom(fs.readFileSync("temp/bom-test.json", { encoding: "utf8" }));

        expect(fileContent.hadBOM).toBe(true);

        let jp = new JsonPatcher();
        fileContent.content = jp.apply(fileContent.content, operation);

        let restoredContent = bom.restoreBom(fileContent);
        expect(restoredContent).toMatch(/^\uFEFF/);
    });

    test("mixed operations - add, replace, remove", () => {
        let patchSyntax = [
            '= /version => "3.0.0"',
            '+ /license => "Apache-2.0"',
            '- /keywords',
            '= /bugs/url => "https://issues.example.com"',
            '+ /bugs/type => "github"'
        ];

        let operation = patcher.parsePatchSyntax(patchSyntax.join("\n"));
        let fileContent = bom.removeBom(fs.readFileSync("temp/test.json", { encoding: "utf8" }));

        let jp = new JsonPatcher();
        let response = jp.apply(fileContent.content, operation);
        let result = JSON.parse(response);

        expect(result.version).toEqual("3.0.0");
        expect(result.license).toEqual("Apache-2.0");
        expect(result.keywords).toBeUndefined();
        expect(result.bugs.url).toEqual("https://issues.example.com");
        expect(result.bugs.type).toEqual("github");
    });

    test("patch syntax with leading/trailing whitespace should be trimmed", () => {
        let patchSyntax = [
            "  = /version => \"1.0.1\"  ",
            "   + /author => \"Test\"   "
        ];

        let operation = patcher.parsePatchSyntax(patchSyntax.join("\n"));

        expect(operation.length).toEqual(2);
        expect(operation[0].op).toEqual("replace");
        expect(operation[1].op).toEqual("add");
    });

    test("stringify function should correctly format operations", () => {
        let addOp = { op: "add" as const, path: "/test", value: "value" };
        let removeOp = { op: "remove" as const, path: "/test" };
        let replaceOp = { op: "replace" as const, path: "/test", value: "newvalue" };

        expect(patcher.stringify(addOp)).toEqual('+ /test => "value"');
        expect(patcher.stringify(removeOp)).toEqual('- /test');
        expect(patcher.stringify(replaceOp)).toEqual('= /test => "newvalue"');
    });

    test("preserve JSON formatting with proper indentation", () => {
        // Create a properly formatted JSON file with 2-space indentation
        const formattedJson = JSON.stringify(inputJson, null, 2);
        fs.writeFileSync("temp/formatted.json", formattedJson, { encoding: "utf8" });

        let patchSyntax = [
            '= /version => "2.0.0"'
        ];

        let operation = patcher.parsePatchSyntax(patchSyntax.join("\n"));
        let fileContent = bom.removeBom(fs.readFileSync("temp/formatted.json", { encoding: "utf8" }));

        let jp = new JsonPatcher();
        let response = jp.apply(fileContent.content, operation);

        // Verify the output is properly formatted
        expect(response).toContain('\n  "version"');
        expect(response).toContain('\n  "keywords"');

        // Verify content is correct
        let result = JSON.parse(response);
        expect(result.version).toEqual("2.0.0");
    });

    test("preserve JSON formatting with 4-space indentation", () => {
        // Create a properly formatted JSON file with 4-space indentation
        const formattedJson = JSON.stringify(inputJson, null, 4);
        fs.writeFileSync("temp/formatted4.json", formattedJson, { encoding: "utf8" });

        let patchSyntax = [
            '= /version => "3.0.0"'
        ];

        let operation = patcher.parsePatchSyntax(patchSyntax.join("\n"));
        let fileContent = bom.removeBom(fs.readFileSync("temp/formatted4.json", { encoding: "utf8" }));

        let jp = new JsonPatcher();
        let response = jp.apply(fileContent.content, operation);

        // Verify the output uses 4-space indentation
        expect(response).toContain('\n    "version"');
        expect(response).toContain('\n    "keywords"');

        // Verify content is correct
        let result = JSON.parse(response);
        expect(result.version).toEqual("3.0.0");
    });
});
