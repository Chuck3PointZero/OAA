export type PropertyType = "string" | "integer" | "float" | "boolean" | "currency" | "date" | "datetime" | "date-period" | string;
export type Cardinality = "one-to-one" | "one-to-many" | "many-to-one" | "many-to-many";
export interface OntoProperty {
    name: string;
    type: PropertyType;
    description?: string;
    required?: boolean;
}
export interface OntoRelationship {
    name: string;
    to: string;
    cardinality: Cardinality;
    description?: string;
}
export interface OntoConcept {
    name: string;
    description: string;
    identity: string | string[];
    properties: OntoProperty[];
    relationships: OntoRelationship[];
}
export interface OntoDomain {
    domain: string;
    version: number;
    description: string;
    imports?: string[];
    concepts: OntoConcept[];
    sourcePath: string;
}
export interface ConceptMapping {
    conceptOrProperty: string;
    apiName: string;
}
export interface ToolConceptMap {
    tool: string;
    channelName?: string;
    maps: ConceptMapping[];
    notes?: string;
    sourcePath: string;
}
export interface OntologyGraph {
    domains: OntoDomain[];
    toolMaps: ToolConceptMap[];
    allConcepts: Map<string, {
        concept: OntoConcept;
        domain: OntoDomain;
    }>;
}
export interface OntoFinding {
    severity: "error" | "warning" | "gap";
    check: string;
    source: string;
    message: string;
    fix?: string;
}
export interface OntoValidationResult {
    verdict: "VALID" | "VALID-WITH-WARNINGS" | "INVALID";
    findings: OntoFinding[];
}
