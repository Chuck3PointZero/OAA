import type { Program } from "./ast.js";
export declare class ParseError extends Error {
    line: number;
    col: number;
    file: string;
    constructor(message: string, line: number, col: number, file: string);
}
export declare function parseFile(source: string, filePath: string): Program;
