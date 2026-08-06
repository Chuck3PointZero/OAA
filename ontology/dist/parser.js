// Recursive descent parser for the OAA Ontology formal language
// Consumes the Token[] from the lexer and produces a Program AST.
import { tokenize } from "./lexer.js";
export class ParseError extends Error {
    line;
    col;
    file;
    constructor(message, line, col, file) {
        super(`Parse error at ${file}:${line}:${col} — ${message}`);
        this.line = line;
        this.col = col;
        this.file = file;
    }
}
const VALID_CARDINALITIES = new Set([
    "one-to-one",
    "one-to-many",
    "many-to-one",
    "many-to-many",
]);
const BUILT_IN_TYPES = new Set([
    "String",
    "Integer",
    "Float",
    "Boolean",
    "Currency",
    "Date",
    "DateTime",
    "DatePeriod",
]);
class Parser {
    tokens;
    pos = 0;
    filePath;
    constructor(tokens, filePath) {
        this.tokens = tokens;
        this.filePath = filePath;
    }
    peek() {
        return this.tokens[this.pos];
    }
    peekType() {
        return this.peek().type;
    }
    peekValue() {
        return this.peek().value;
    }
    advance() {
        const t = this.tokens[this.pos];
        if (this.pos < this.tokens.length - 1)
            this.pos++;
        return t;
    }
    loc() {
        return { line: this.peek().line, col: this.peek().col };
    }
    check(type, value) {
        if (this.peek().type !== type)
            return false;
        if (value !== undefined && this.peek().value !== value)
            return false;
        return true;
    }
    match(type, value) {
        if (this.check(type, value))
            return this.advance();
        return null;
    }
    expect(type, value) {
        if (!this.check(type, value)) {
            const t = this.peek();
            const expected = value ? `'${value}'` : type;
            throw new ParseError(`Expected ${expected} but got ${t.type}('${t.value}')`, t.line, t.col, this.filePath);
        }
        return this.advance();
    }
    expectIdent(expected) {
        return this.expect("IDENT", expected);
    }
    drainComments() {
        let lastComment;
        while (this.check("COMMENT")) {
            lastComment = this.advance().value;
        }
        return lastComment;
    }
    trailingComment(afterLine) {
        if (this.check("COMMENT") && this.peek().line === afterLine) {
            return this.advance().value;
        }
        return undefined;
    }
    parse() {
        const statements = [];
        while (!this.check("EOF")) {
            const doc = this.drainComments();
            if (this.check("EOF"))
                break;
            const stmt = this.parseStatement(doc);
            if (stmt)
                statements.push(stmt);
        }
        return { statements, sourcePath: this.filePath };
    }
    parseStatement(doc) {
        const t = this.peek();
        if (t.type !== "IDENT") {
            throw new ParseError(`Expected statement keyword but got ${t.type}('${t.value}')`, t.line, t.col, this.filePath);
        }
        switch (t.value) {
            case "type": return this.parseTypeDecl(doc);
            case "enum": return this.parseEnumDecl(doc);
            case "entity": return this.parseEntityOrDerived(doc);
            case "map": return this.parseMapDecl(doc);
            default:
                throw new ParseError(`Unknown statement keyword '${t.value}'`, t.line, t.col, this.filePath);
        }
    }
    parseTypeDecl(doc) {
        const loc = this.loc();
        this.expectIdent("type");
        const name = this.expectIdent().value;
        this.expect("COLON");
        const base = this.expectIdent().value;
        const trailingDoc = this.trailingComment(this.tokens[this.pos - 1].line);
        return { kind: "TypeDecl", name, base, doc: trailingDoc ?? doc, loc };
    }
    parseEnumDecl(doc) {
        const loc = this.loc();
        this.expectIdent("enum");
        const name = this.expectIdent().value;
        this.expect("EQ");
        const values = [this.expectIdent().value];
        while (this.match("PIPE")) {
            values.push(this.expectIdent().value);
        }
        return { kind: "EnumDecl", name, values, doc, loc };
    }
    parseEntityOrDerived(doc) {
        const loc = this.loc();
        this.expectIdent("entity");
        const name = this.expectIdent().value;
        if (this.check("IDENT", "extends")) {
            return this.parseDerivedEntity(name, doc, loc);
        }
        return this.parseEntityBody(name, doc, loc);
    }
    parseDerivedEntity(name, doc, loc) {
        this.expectIdent("extends");
        const base = this.expectIdent().value;
        this.expect("LBRACE");
        this.drainComments();
        this.expectIdent("where");
        this.expect("COLON");
        const where = this.parseExpr();
        this.drainComments();
        this.expect("RBRACE");
        return { kind: "DerivedEntityDecl", name, base, where, doc, loc };
    }
    parseEntityBody(name, doc, loc) {
        this.expect("LBRACE");
        let identifiedBy;
        const properties = [];
        const relations = [];
        const constraints = [];
        while (!this.check("RBRACE") && !this.check("EOF")) {
            this.drainComments();
            if (this.check("RBRACE"))
                break;
            const t = this.peek();
            if (t.type !== "IDENT") {
                throw new ParseError(`Expected declaration keyword in entity body, got ${t.type}('${t.value}')`, t.line, t.col, this.filePath);
            }
            switch (t.value) {
                case "identified-by": {
                    this.advance();
                    this.expect("COLON");
                    identifiedBy = this.expectIdent().value;
                    break;
                }
                case "property": {
                    properties.push(this.parsePropertyDecl());
                    break;
                }
                case "relation": {
                    relations.push(this.parseRelationDecl());
                    break;
                }
                case "constraint": {
                    constraints.push(this.parseConstraintDecl());
                    break;
                }
                default:
                    throw new ParseError(`Unknown entity body keyword '${t.value}'`, t.line, t.col, this.filePath);
            }
        }
        this.expect("RBRACE");
        return { kind: "EntityDecl", name, identifiedBy, properties, relations, constraints, doc, loc };
    }
    parsePropertyDecl() {
        const loc = this.loc();
        this.expectIdent("property");
        const name = this.expectIdent().value;
        this.expect("COLON");
        const type = this.expectIdent().value;
        const lastTokenLine = this.tokens[this.pos - 1].line;
        const doc = this.trailingComment(lastTokenLine);
        return { kind: "PropertyDecl", name, type, doc, constraint: undefined, loc };
    }
    parseRelationDecl() {
        const loc = this.loc();
        this.expectIdent("relation");
        const name = this.expectIdent().value;
        this.expect("COLON");
        const target = this.expectIdent().value;
        this.expect("LBRACKET");
        const cardIdent = this.expectIdent();
        if (!VALID_CARDINALITIES.has(cardIdent.value)) {
            throw new ParseError(`Invalid cardinality '${cardIdent.value}'. Must be one of: ${[...VALID_CARDINALITIES].join(", ")}`, cardIdent.line, cardIdent.col, this.filePath);
        }
        this.expect("RBRACKET");
        const cardinality = cardIdent.value;
        const lastTokenLine = this.tokens[this.pos - 1].line;
        const doc = this.trailingComment(lastTokenLine);
        return { kind: "RelationDecl", name, target, cardinality, doc, loc };
    }
    parseConstraintDecl() {
        const loc = this.loc();
        this.expectIdent("constraint");
        const name = this.expectIdent().value;
        this.expect("COLON");
        const expr = this.parseExpr();
        const lastTokenLine = this.tokens[this.pos - 1].line;
        const doc = this.trailingComment(lastTokenLine);
        return { kind: "ConstraintDecl", name, expr, doc, loc };
    }
    parseMapDecl(doc) {
        const loc = this.loc();
        this.expectIdent("map");
        const tool = this.expectIdent().value;
        this.expect("LBRACE");
        const entries = [];
        const noteLines = [];
        while (!this.check("RBRACE") && !this.check("EOF")) {
            while (this.check("COMMENT")) {
                noteLines.push(this.advance().value);
            }
            if (this.check("RBRACE"))
                break;
            const source = this.parseQualifiedName();
            this.expect("ARROW");
            let target;
            if (this.check("IDENT", "implicit")) {
                this.advance();
                target = "implicit";
            }
            else {
                target = this.parseQualifiedName();
            }
            const entryLine = this.tokens[this.pos - 1].line;
            const entryNote = this.trailingComment(entryLine);
            entries.push({ source, target, note: entryNote });
        }
        this.expect("RBRACE");
        return {
            kind: "MapDecl",
            tool,
            entries,
            notes: noteLines.join(" "),
            doc,
            loc,
        };
    }
    parseQualifiedName() {
        const base = this.expectIdent().value;
        if (this.match("DOT")) {
            const field = this.expectIdent().value;
            return `${base}.${field}`;
        }
        return base;
    }
    parseExpr() {
        return this.parseOr();
    }
    parseOr() {
        let left = this.parseAnd();
        while (this.check("IDENT", "or")) {
            const loc = this.loc();
            this.advance();
            const right = this.parseAnd();
            left = { kind: "BinaryExpr", op: "or", left, right, loc };
        }
        return left;
    }
    parseAnd() {
        let left = this.parseNot();
        while (this.check("IDENT", "and")) {
            const loc = this.loc();
            this.advance();
            const right = this.parseNot();
            left = { kind: "BinaryExpr", op: "and", left, right, loc };
        }
        return left;
    }
    parseNot() {
        if (this.check("IDENT", "not")) {
            const loc = this.loc();
            this.advance();
            const operand = this.parseNot();
            return { kind: "UnaryExpr", op: "not", operand, loc };
        }
        return this.parseComparison();
    }
    parseComparison() {
        const left = this.parsePrimary();
        const opMap = {
            GT: ">", LT: "<", GTE: ">=", LTE: "<=", EQ: "=", NEQ: "!=",
        };
        const tt = this.peekType();
        if (tt in opMap) {
            const loc = this.loc();
            const op = opMap[this.advance().type];
            const right = this.parsePrimary();
            return { kind: "BinaryExpr", op, left, right, loc };
        }
        return left;
    }
    parsePrimary() {
        const t = this.peek();
        const loc = { line: t.line, col: t.col };
        if (t.type === "NUMBER") {
            this.advance();
            return { kind: "NumberLiteral", value: parseFloat(t.value), loc };
        }
        if (t.type === "STRING") {
            this.advance();
            return { kind: "StringLiteral", value: t.value, loc };
        }
        if (t.type === "IDENT") {
            this.advance();
            return { kind: "IdentRef", name: t.value, loc };
        }
        throw new ParseError(`Expected expression but got ${t.type}('${t.value}')`, t.line, t.col, this.filePath);
    }
}
export function parseFile(source, filePath) {
    const tokens = tokenize(source, filePath);
    const parser = new Parser(tokens, filePath);
    return parser.parse();
}
