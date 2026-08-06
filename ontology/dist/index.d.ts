#!/usr/bin/env node
/**
 * @oaa/ontology — MCP server for OAA business domain ontology
 *
 * Source format: .rel files (formal logic language)
 * Compiled outputs: ONTOLOGY.md + schema.sql (generated, never hand-edited)
 *
 * Tools:
 *   compile_ontology   — parse .rel files, type-check, write ONTOLOGY.md
 *   validate_ontology  — validate without writing output
 *   get_concepts       — return structured concept catalog
 *   compile_schema     — emit schema.sql + initialise SQLite memory store
 *   write_entity       — upsert an entity instance into the store
 *   query_concept      — query base entity or derived concept (returns rows)
 */
export {};
