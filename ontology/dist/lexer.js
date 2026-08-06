// Lexer for the OAA Ontology formal language (.rel files)
//
// Notable: identifiers may contain hyphens (kebab-case) provided the hyphen
// has no surrounding whitespace and is followed by a letter or digit.
// e.g. "start-date", "runs-on", "many-to-many" are all single IDENT tokens.
// The arithmetic minus "-" only appears in expressions and is always surrounded
// by whitespace or follows a digit.
export class LexerError extends Error {
    line;
    col;
    constructor(message, line, col) {
        super(`Lexer error at ${line}:${col} — ${message}`);
        this.line = line;
        this.col = col;
    }
}
export function tokenize(source, filePath) {
    const tokens = [];
    let pos = 0;
    let line = 1;
    let lineStart = 0;
    function col() {
        return pos - lineStart + 1;
    }
    function peek(offset = 0) {
        return source[pos + offset] ?? "";
    }
    function advance() {
        const ch = source[pos++];
        if (ch === "\n") {
            line++;
            lineStart = pos;
        }
        return ch;
    }
    function skipWhitespace() {
        while (pos < source.length) {
            const ch = peek();
            if (ch === " " || ch === "\t" || ch === "\r" || ch === "\n") {
                advance();
            }
            else {
                break;
            }
        }
    }
    function readIdent() {
        // Read an identifier, which may contain hyphens when hyphen is
        // immediately followed by a letter or digit (no whitespace gap).
        let result = "";
        while (pos < source.length) {
            const ch = peek();
            if (/[a-zA-Z0-9_]/.test(ch)) {
                result += advance();
            }
            else if (ch === "-" && /[a-zA-Z0-9]/.test(peek(1))) {
                // Lookahead: hyphen immediately followed by alphanumeric → part of ident
                result += advance(); // consume '-'
                result += advance(); // consume next char
            }
            else {
                break;
            }
        }
        return result;
    }
    function readNumber() {
        let result = "";
        while (pos < source.length && /[0-9]/.test(peek())) {
            result += advance();
        }
        if (peek() === "." && /[0-9]/.test(peek(1))) {
            result += advance(); // '.'
            while (pos < source.length && /[0-9]/.test(peek())) {
                result += advance();
            }
        }
        return result;
    }
    function readString() {
        advance(); // opening quote
        let result = "";
        while (pos < source.length && peek() !== '"') {
            if (peek() === "\\") {
                advance();
                const escaped = advance();
                result += escaped === "n" ? "\n" : escaped;
            }
            else {
                result += advance();
            }
        }
        if (pos >= source.length) {
            throw new LexerError("Unterminated string literal", line, col());
        }
        advance(); // closing quote
        return result;
    }
    function readLineComment() {
        // consume "//"
        advance();
        advance();
        let result = "";
        while (pos < source.length && peek() !== "\n") {
            result += advance();
        }
        return result.trim();
    }
    while (pos < source.length) {
        skipWhitespace();
        if (pos >= source.length)
            break;
        const startLine = line;
        const startCol = col();
        const ch = peek();
        // Line comment
        if (ch === "/" && peek(1) === "/") {
            const text = readLineComment();
            tokens.push({ type: "COMMENT", value: text, line: startLine, col: startCol });
            continue;
        }
        // Identifier / keyword
        if (/[a-zA-Z_]/.test(ch)) {
            const ident = readIdent();
            tokens.push({ type: "IDENT", value: ident, line: startLine, col: startCol });
            continue;
        }
        // Number
        if (/[0-9]/.test(ch)) {
            const num = readNumber();
            tokens.push({ type: "NUMBER", value: num, line: startLine, col: startCol });
            continue;
        }
        // String
        if (ch === '"') {
            const str = readString();
            tokens.push({ type: "STRING", value: str, line: startLine, col: startCol });
            continue;
        }
        // Multi-char operators
        if (ch === "-" && peek(1) === ">") {
            advance();
            advance();
            tokens.push({ type: "ARROW", value: "->", line: startLine, col: startCol });
            continue;
        }
        if (ch === ">" && peek(1) === "=") {
            advance();
            advance();
            tokens.push({ type: "GTE", value: ">=", line: startLine, col: startCol });
            continue;
        }
        if (ch === "<" && peek(1) === "=") {
            advance();
            advance();
            tokens.push({ type: "LTE", value: "<=", line: startLine, col: startCol });
            continue;
        }
        if (ch === "!" && peek(1) === "=") {
            advance();
            advance();
            tokens.push({ type: "NEQ", value: "!=", line: startLine, col: startCol });
            continue;
        }
        // Single-char tokens
        const single = {
            "|": "PIPE",
            "{": "LBRACE",
            "}": "RBRACE",
            "[": "LBRACKET",
            "]": "RBRACKET",
            ":": "COLON",
            ".": "DOT",
            ">": "GT",
            "<": "LT",
            "=": "EQ",
        };
        if (ch in single) {
            advance();
            tokens.push({ type: single[ch], value: ch, line: startLine, col: startCol });
            continue;
        }
        throw new LexerError(`Unexpected character '${ch}'`, startLine, startCol);
    }
    tokens.push({ type: "EOF", value: "", line, col: col() });
    return tokens;
}
