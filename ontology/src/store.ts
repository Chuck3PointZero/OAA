// SQLite instance store for OAA Ontology entity data.
// Primary DB path: <root>/memory/ontology.db
// Fallback (e.g. mounted filesystem): /tmp/oaa-<root-hash>.db
// Backed by node:sqlite (built into Node 22.5+, requires --experimental-sqlite).

import { mkdirSync, existsSync } from "fs";
import { join } from "path";
import { createHash } from "crypto";
import { tmpdir } from "os";
import type { Program } from "./ast.js";
import type { OntologySymbols } from "./checker.js";
import { propToCol } from "./sql.js";

let DatabaseSync: any = null;
let sqliteAvailable = false;

async function loadSQLite(): Promise<boolean> {
  if (sqliteAvailable) return true;
  try {
    const mod = await import("node:sqlite" as any);
    DatabaseSync = mod.DatabaseSync;
    sqliteAvailable = true;
    return true;
  } catch {
    return false;
  }
}

function tryOpenDB(path: string, schemaSQL: string): any {
  try {
    const db = new DatabaseSync(path);
    db.exec(schemaSQL);
    return db;
  } catch {
    return null;
  }
}

export class OntologyStore {
  private db: any = null;
  private dbPath: string = "(none)";
  private symbols: OntologySymbols;
  private programs: Program[];
  private rootDir: string;

  constructor(rootDir: string, symbols: OntologySymbols, programs: Program[]) {
    this.rootDir = rootDir;
    this.symbols = symbols;
    this.programs = programs;
  }

  async open(schemaSQL: string): Promise<{ ok: boolean; dbPath?: string; error?: string }> {
    const available = await loadSQLite();
    if (!available) {
      return {
        ok: false,
        error: "node:sqlite not available. Start with: node --experimental-sqlite dist/index.js",
      };
    }

    // Try primary path: <rootDir>/memory/ontology.db
    const memDir = join(this.rootDir, "memory");
    try { mkdirSync(memDir, { recursive: true }); } catch {}
    const primaryPath = join(memDir, "ontology.db");
    let db = tryOpenDB(primaryPath, schemaSQL);
    if (db) {
      this.db = db;
      this.dbPath = primaryPath;
      return { ok: true, dbPath: primaryPath };
    }

    // Fallback: /tmp/oaa-<hash>.db (for mounted/network filesystems)
    const hash = createHash("sha1").update(this.rootDir).digest("hex").slice(0, 8);
    const fallbackPath = join(tmpdir(), "oaa-" + hash + ".db");
    db = tryOpenDB(fallbackPath, schemaSQL);
    if (db) {
      this.db = db;
      this.dbPath = fallbackPath;
      return { ok: true, dbPath: fallbackPath };
    }

    // Last resort: in-memory (lost when process exits)
    db = tryOpenDB(":memory:", schemaSQL);
    if (db) {
      this.db = db;
      this.dbPath = ":memory:";
      return { ok: true, dbPath: ":memory: (ephemeral — persists only while server is running)" };
    }

    return { ok: false, error: "Could not open SQLite database at any path." };
  }

  isOpen(): boolean { return this.db !== null; }
  getDbPath(): string { return this.dbPath; }

  writeEntity(
    kind: string,
    id: string,
    fields: Record<string, unknown>,
    source?: string
  ): { ok: boolean; error?: string } {
    if (!this.db) return { ok: false, error: "Store not open. Call compile_schema first." };

    const entityEntry = this.symbols.entities.get(kind);
    if (!entityEntry) {
      return { ok: false, error: "Unknown entity '" + kind + "'. Known: " + [...this.symbols.entities.keys()].join(", ") };
    }
    if (entityEntry.decl.kind !== "EntityDecl") {
      return { ok: false, error: "'" + kind + "' is a derived concept (view). Write to the base entity '" + (entityEntry.decl as any).base + "' instead." };
    }

    const knownProps = new Set(entityEntry.decl.properties.map((p) => p.name));
    const cols: string[] = ["id"];
    const vals: unknown[] = [id];

    for (const [key, val] of Object.entries(fields)) {
      if (!knownProps.has(key)) {
        return { ok: false, error: "Property '" + key + "' is not declared on '" + kind + "'." };
      }
      cols.push(propToCol(key));
      vals.push(val);
    }

    if (source) { cols.push("_source"); vals.push(source); }
    cols.push("_updated_at");
    vals.push(new Date().toISOString());

    const placeholders = vals.map(() => "?").join(", ");
    const colList = cols.join(", ");
    const updateSet = cols
      .filter((c) => c !== "id")
      .map((c) => c + " = excluded." + c)
      .join(", ");
    const sql = "INSERT INTO " + kind + " (" + colList + ") VALUES (" + placeholders + ")"
      + " ON CONFLICT(id) DO UPDATE SET " + updateSet + ";";

    try {
      this.db.prepare(sql).run(...vals);
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: String(err.message) };
    }
  }

  queryConcept(conceptName: string, filters?: Record<string, unknown>): {
    ok: boolean; rows?: Record<string, unknown>[]; sql?: string; error?: string;
  } {
    if (!this.db) return { ok: false, error: "Store not open. Call compile_schema first." };

    if (!this.symbols.entities.has(conceptName)) {
      return { ok: false, error: "Unknown concept '" + conceptName + "'. Known: " + [...this.symbols.entities.keys()].join(", ") };
    }

    let sql = "SELECT * FROM " + conceptName;
    const vals: unknown[] = [];

    if (filters && Object.keys(filters).length > 0) {
      const whereClauses = Object.keys(filters).map((k) => {
        vals.push(filters[k]);
        return propToCol(k) + " = ?";
      });
      sql += " WHERE " + whereClauses.join(" AND ");
    }
    sql += ";";

    try {
      const rows = this.db.prepare(sql).all(...vals) as Record<string, unknown>[];
      return { ok: true, rows, sql };
    } catch (err: any) {
      return { ok: false, error: String(err.message), sql };
    }
  }
}
