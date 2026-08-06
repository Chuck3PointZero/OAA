// Discovers and loads .rel files from a root directory
import { readFileSync } from "fs";
import { glob } from "glob";
import { parseFile } from "./parser.js";
export function loadPrograms(rootDir) {
    const files = glob.sync("**/*.rel", {
        cwd: rootDir,
        absolute: true,
        ignore: ["**/node_modules/**", "**/dist/**"],
    });
    return files.map((f) => parseFile(readFileSync(f, "utf-8"), f));
}
