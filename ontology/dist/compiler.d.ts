import type { Program } from "./ast.js";
import type { OntologySymbols } from "./checker.js";
export declare function compileToMarkdown(programs: Program[], symbols: OntologySymbols, outputPath: string): string;
