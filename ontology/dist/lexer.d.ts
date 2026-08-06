export type TokenType = "IDENT" | "NUMBER" | "STRING" | "ARROW" | "PIPE" | "LBRACE" | "RBRACE" | "LBRACKET" | "RBRACKET" | "COLON" | "DOT" | "GT" | "LT" | "GTE" | "LTE" | "EQ" | "NEQ" | "COMMENT" | "EOF";
export interface Token {
    type: TokenType;
    value: string;
    line: number;
    col: number;
}
export declare class LexerError extends Error {
    line: number;
    col: number;
    constructor(message: string, line: number, col: number);
}
export declare function tokenize(source: string, filePath: string): Token[];
