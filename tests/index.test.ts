import { promises as fs } from "fs";
import * as patcher from "../src/patcher";
import { JsonPatcher } from "../src/JsonPatcher";
import * as index from "../src/index";
import * as core from "@actions/core";

jest.mock("@actions/core");

const inputSpy = jest.spyOn(core, "getInput");

describe("input validation", () => {

    test("validate if 'files' is being read with 'required' flag", async () => {
        await index.run();
        expect(inputSpy).toHaveBeenCalledWith("files", { "required": true });
    });

    test("validate if 'patch-syntax' is being read with 'required' flag", async () => {
        await index.run();
        expect(inputSpy).toHaveBeenCalledWith("patch-syntax", { "required": true });
    });

});

describe("basic functionality", () => {
    beforeEach(async () => {
        await fs.writeFile("test.txt", "hello #{MY_TOKEN}#", "utf8");
        await fs.mkdir("temp");
        await fs.writeFile("temp/test.json", "{\"version\":\"1.0.0\",\"keywords\":[],\"author\":\"onlyutkarsh\",\"bugs\":{\"url\":\"http://www.dummy.com\"}}");

        // set required inputs via environment variables
        // process.env["INPUT_FILES"] = [
        //     "testfiles/**/*.json",
        //     "testfiles/**/*.config"
        // ]
        //     .join("\n");
    });

    afterEach(async () => {
        await fs.unlink("test.txt");
        await fs.rmdir("temp", { recursive: true });

        // delete environment variables
        // delete process.env["INPUT_FILES"];

        jest.restoreAllMocks();
    });

    test("validate if all the inputs are read", async () => {

        let getInputSpy = jest.spyOn(core, "getInput").mockImplementation((name, options) => {
            switch (name) {
                case "files":
                    return ["testfiles/**/*.json", "testfiles/**/*.config"].join("\n");

                case "patch-syntax":
                    return [
                        "= /version => \"1.0.1\"",
                        "= /name => \"utkarsh\"",
                        "+ /bugs/name => \"Google\"",
                        "= /bugs/url => \"https://www.google.com\""
                    ].join("\n");

                case "output-patched-file":
                    return "true";
            }
            //! Validate to have been called x times to check if input matches what is read
            //! pass invalid args to see it returns error
            //

            return "";
        });

        await index.run();

        //expect(getInputSpy).toHaveBeenCalledTimes(3);
    });

    test("find matching files in a directory should return one file", async () => {
        let paths = await readfiles();
        expect(paths.length).toEqual(1);
    });

    test("parse patch syntax and validate its json-patch compatible", async () => {

        let patchSyntax = [
            "= /version => \"1.0.1\"",
            "= /name => \"utkarsh\"",
            "+ /bugs/name => \"Google\"",
            "= /bugs/url => \"https://www.google.com\""
        ];

        let operation = patcher.parsePatchSyntax(patchSyntax.join("\n"));

        expect(operation.length).toEqual(4);
    });

    test("apply patch and validate json", async () => {

        let filePattern = ["temp/*.json"];
        let patchSyntax = [
            "= /version => \"1.0.1\"",
            "= /author => \"utkarsh\"",
            "+ /bugs/name => \"Google\"",
            "= /bugs/url => \"https://www.google.com\""
        ];

        let jp = new JsonPatcher();

        let content = await patcher.patchAsync(jp, filePattern, patchSyntax);

    });

    test("add multiiple elements to file", async () => {

    });

    test("replace multiple tokens in file", async () => {
    });

    test("remove single token in file", async () => {

    });

    test("remove multiple tokens in file", async () => {

    });
});

async function readfiles() {
    let pattern = ["temp/*.json"];
    let files = pattern.join("\n");
    let globber = await patcher.globFilesAsync(files);
    let paths = await globber.glob();
    return paths;
}
