import { promises as fs } from "fs";
import * as process from "process";
import { patchfiles } from "../src/patchfiles";


describe("basic functionality", () => {
    beforeEach(async () => {
        await fs.writeFile("test.txt", "hello #{ACTOR}#", "utf8");
        await fs.writeFile("test2.txt", "#{GREETING}# #{ACTOR}#", "utf8");
    });

    afterEach(async () => {
        await fs.unlink("test.txt");
        await fs.unlink("test2.txt");
    });

    test("replaces single token in file", async () => {
        process.env["ACTOR"] = "world";
        let content = await patchfiles();

        expect(content).toBe("hello world");
    });
});