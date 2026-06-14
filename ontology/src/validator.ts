import type {
  OntologyGraph,
  OntoDomain,
  OntoConcept,
  OntoFinding,
  OntoValidationResult,
  ToolConceptMap,
} from "./types.js";

const VALID_CARDINALITIES = new Set([
  "one-to-one",
  "one-to-many",
  "many-to-one",
  "many-to-many",
]);

export function validateOntologyGraph(graph: OntologyGraph): OntoValidationResult {
  const findings: OntoFinding[] = [];

  // --- Concept integrity ---
  for (const domain of graph.domains) {
    validateDomain(domain, graph, findings);
  }

  // --- Tool map integrity ---
  for (const toolMap of graph.toolMaps) {
    validateToolMap(toolMap, graph, findings);
  }

  const errors = findings.filter((f) => f.severity === "error");
  const warnings = findings.filter((f) => f.severity === "warning");

  const verdict =
    errors.length > 0
      ? "INVALID"
      : warnings.length > 0
      ? "VALID-WITH-WARNINGS"
      : "VALID";

  return { verdict, findings };
}

function validateDomain(
  domain: OntoDomain,
  graph: OntologyGraph,
  findings: OntoFinding[]
): void {
  const src = domain.sourcePath;

  // Required fields
  if (!domain.domain) {
    findings.push({
      severity: "error",
      check: "Domain Identity",
      source: src,
      message: 'Domain file is missing required "domain" field.',
      fix: 'Add "domain: <name>" to the YAML.',
    });
  }
  if (!domain.description) {
    findings.push({
      severity: "warning",
      check: "Domain Identity",
      source: src,
      message: `Domain "${domain.domain}" is missing a description.`,
    });
  }

  // Concept naming conventions
  const conceptNames = new Set<string>();
  for (const concept of domain.concepts) {
    validateConcept(concept, domain, graph, findings, conceptNames);
    conceptNames.add(concept.name);
  }
}

function validateConcept(
  concept: OntoConcept,
  domain: OntoDomain,
  graph: OntologyGraph,
  findings: OntoFinding[],
  seenNames: Set<string>
): void {
  const src = domain.sourcePath;

  // Name
  if (!concept.name) {
    findings.push({
      severity: "error",
      check: "Concept Identity",
      source: src,
      message: "A concept is missing its required name.",
    });
    return;
  }

  // PascalCase check
  if (!/^[A-Z][a-zA-Z0-9]*$/.test(concept.name)) {
    findings.push({
      severity: "warning",
      check: "Concept Identity",
      source: src,
      message: `Concept "${concept.name}" should use PascalCase (e.g., "CustomerAcquisition").`,
      fix: `Rename to PascalCase.`,
    });
  }

  // Duplicate name within domain
  if (seenNames.has(concept.name)) {
    findings.push({
      severity: "error",
      check: "Concept Identity",
      source: src,
      message: `Duplicate concept name "${concept.name}" in domain "${domain.domain}".`,
      fix: "Each concept in a domain must have a unique name.",
    });
  }

  // Description
  if (!concept.description) {
    findings.push({
      severity: "warning",
      check: "Concept Identity",
      source: src,
      message: `Concept "${concept.name}" is missing a description.`,
    });
  }

  // Identity
  if (
    !concept.identity ||
    (Array.isArray(concept.identity) && concept.identity.length === 0) ||
    concept.identity === ""
  ) {
    findings.push({
      severity: "error",
      check: "Concept Identity",
      source: src,
      message: `Concept "${concept.name}" is missing an "identity" field. Every concept needs a stable business key.`,
      fix: `Add "identity: <field-name>" or "identity: [field1, field2]" for compound keys.`,
    });
  }

  // Relationship targets
  for (const rel of concept.relationships) {
    if (!rel.name) {
      findings.push({
        severity: "error",
        check: "Relationships",
        source: src,
        message: `A relationship on "${concept.name}" is missing its "name" field.`,
      });
    }
    if (!rel.to) {
      findings.push({
        severity: "error",
        check: "Relationships",
        source: src,
        message: `Relationship "${rel.name}" on "${concept.name}" is missing "to:" target.`,
      });
    } else if (!graph.allConcepts.has(rel.to)) {
      // Check if it's in an imported domain (lenient) or truly unknown
      findings.push({
        severity: "warning",
        check: "Relationships",
        source: src,
        message: `Relationship "${rel.name}" on "${concept.name}" references concept "${rel.to}" which is not defined in this graph. If it's in another domain, add that domain to "imports:".`,
      });
    }

    if (!VALID_CARDINALITIES.has(rel.cardinality)) {
      findings.push({
        severity: "error",
        check: "Relationships",
        source: src,
        message: `Relationship "${rel.name}" on "${concept.name}" has invalid cardinality "${rel.cardinality}".`,
        fix: `Use one of: one-to-one, one-to-many, many-to-one, many-to-many`,
      });
    }

    // Warn if relationship name looks like an API name (contains API patterns)
    if (/[_]id$|[A-Z]{2,}/.test(rel.name)) {
      findings.push({
        severity: "warning",
        check: "Vocabulary",
        source: src,
        message: `Relationship "${rel.name}" on "${concept.name}" may be using API/schema vocabulary. Use business verb phrases instead.`,
      });
    }
  }

  // Property name conventions (warn on API-style names)
  for (const prop of concept.properties) {
    if (!prop.name) {
      findings.push({
        severity: "error",
        check: "Properties",
        source: src,
        message: `A property on "${concept.name}" is missing its "name" field.`,
      });
    }
    if (!prop.type) {
      findings.push({
        severity: "error",
        check: "Properties",
        source: src,
        message: `Property "${prop.name}" on "${concept.name}" is missing "type".`,
      });
    }
    // Flag possible API vocabulary in property names
    if (/[A-Z]/.test(prop.name) || /_id$/.test(prop.name)) {
      findings.push({
        severity: "warning",
        check: "Vocabulary",
        source: src,
        message: `Property "${prop.name}" on "${concept.name}" may be using API/schema naming. Use lowercase-hyphenated business names.`,
      });
    }
  }
}

function validateToolMap(
  toolMap: ToolConceptMap,
  graph: OntologyGraph,
  findings: OntoFinding[]
): void {
  const src = toolMap.sourcePath;

  if (!toolMap.tool) {
    findings.push({
      severity: "error",
      check: "Tool Map Identity",
      source: src,
      message: 'concept-map.yaml is missing required "tool" field.',
    });
  }

  for (const mapping of toolMap.maps) {
    const [conceptPart, propPart] = mapping.conceptOrProperty.split(".");

    // Check concept exists
    if (!graph.allConcepts.has(conceptPart)) {
      findings.push({
        severity: "error",
        check: "Tool Map References",
        source: src,
        message: `concept-map.yaml for "${toolMap.tool}" references concept "${conceptPart}" which is not in the ontology.`,
        fix: "Add the concept to a .onto.yaml file or correct the mapping key.",
      });
      continue;
    }

    // Check property exists (if it's a property mapping)
    if (propPart) {
      const { concept } = graph.allConcepts.get(conceptPart)!;
      const propExists = concept.properties.some((p) => p.name === propPart);
      if (!propExists) {
        findings.push({
          severity: "error",
          check: "Tool Map References",
          source: src,
          message: `concept-map.yaml for "${toolMap.tool}" references property "${mapping.conceptOrProperty}" but "${propPart}" is not a declared property on "${conceptPart}".`,
          fix: `Add "${propPart}" to "${conceptPart}"'s properties or correct the mapping key.`,
        });
      }
    }
  }

  // Gap: concepts in ontology with no mapping in this tool
  if (graph.domains.length > 0) {
    for (const [conceptName, { domain }] of graph.allConcepts) {
      const hasConcept = toolMap.maps.some(
        (m) => m.conceptOrProperty === conceptName
      );
      if (!hasConcept) {
        findings.push({
          severity: "gap",
          check: "Tool Map Coverage",
          source: src,
          message: `Tool "${toolMap.tool}" has no mapping for concept "${conceptName}" (from domain "${domain.domain}"). Is this intentional?`,
        });
      }
    }
  }
}
