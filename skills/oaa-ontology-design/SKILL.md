---
kind: skill
name: oaa-ontology-design
description: Author and validate OAA business domain ontologies using the .rel formal language
version: 0.2.0
---

# OAA Ontology Design Skill

## What this skill does

Guides you through creating, editing, and validating a business domain ontology for an OAA workspace. The ontology defines **business vocabulary** — the concepts, properties, relationships, and constraints that agents, roles, and skills refer to. Tool nodes then map these business names to API vocabulary.

**Key invariant:** concepts like `Campaign`, `budget`, `Channel` appear throughout the agent graph. The *only* place Meta Ads API names like `AdSet`, `daily_budget` appear is inside a `map` declaration. Swapping tools means replacing one map block — not rewriting roles or skills.

## Source format: `.rel` files

Ontology source files use a formal logic language with extension `.rel`. Never hand-edit the compiled output `ONTOLOGY.md` — edit `.rel` sources and run `compile_ontology`.

### Grammar reference

```
// Scalar type alias
type TypeName : BaseType

// Enumeration
enum EnumName = value1 | value2 | value3

// Base entity
entity EntityName {
  identified-by: TypeName         // optional — primary key type
  property prop-name : Type       // functional relation
  relation rel-name : TargetEntity [cardinality]
  constraint constraint-name: expr
}

// Derived entity (subtype by rule)
entity DerivedName extends BaseEntity {
  where: expr
}

// Tool vocabulary map
map tool-name {
  Concept -> ApiObject            // object type mapping
  Concept.property -> api_field   // field mapping
  Concept -> implicit             // handled in skill logic, no direct API object
}
```

### Built-in types

`String` `Integer` `Float` `Boolean` `Currency` `Date` `DateTime` `DatePeriod`

### Cardinality values

`one-to-one` `one-to-many` `many-to-one` `many-to-many`

### Expression syntax (constraints and where clauses)

```
expr ::= expr or expr
       | expr and expr
       | not expr
       | primary op primary
       | primary

primary ::= identifier       // property name or enum value
          | number           // e.g. 10000
          | "string"         // e.g. "active"

op ::= < | > | <= | >= | = | !=
```

### Kebab-case identifiers

Property names, relation names, constraint names, and type names may use hyphens: `start-date`, `runs-on`, `many-to-many`. No spaces around the hyphen.

### Comments

Line comments with `//`. The first comment before a declaration becomes its doc string.

```rel
// A Campaign is the top-level budget allocation unit.
entity Campaign {
  property budget : Currency  // daily budget in account currency
  ...
}
```

---

## Directory layout

```
<workspace>/
  ontology/
    core.rel              # base entities and types
    relationships.rel     # relations between entities (optional split)
    maps/
      meta-ads.rel        # map declarations for Meta Ads
      google-ads.rel      # map declarations for Google Ads
  ONTOLOGY.md             # compiled output — do not edit
```

Any `.rel` file under the workspace is picked up by `compile_ontology`.

---

## Design workflow

### 1. Scope the domain
Ask: what are the things this team manages? What decisions do they make? What changes from campaign to campaign?

Start with nouns: Campaign, Channel, Audience, Budget, Creative, Product, Customer.

### 2. Declare entities and properties

```rel
type CampaignID : String

entity Campaign {
  identified-by: CampaignID
  property budget : Currency
  property start-date : Date
  property end-date : Date
}
```

Properties are **business** properties — `budget`, not `daily_budget`. That translation lives in the map.

### 3. Add enumerations for categorical values

```rel
enum CampaignObjective = awareness | conversion | retention | reactivation
```

Reference the enum as a property type:
```rel
  property objective : CampaignObjective
```

### 4. Declare relationships

```rel
entity Campaign {
  ...
  relation runs-on : Channel [many-to-many]
  relation targets : Audience [many-to-many]
}
```

### 5. Add integrity constraints

Named constraints at the entity level:
```rel
entity Campaign {
  ...
  constraint valid-dates: start-date <= end-date
  constraint positive-budget: budget > 0
}
```

### 6. Declare derived concepts

Subtypes are defined by logical rules:
```rel
entity HighValueCampaign extends Campaign {
  where: budget > 10000
}
```

An instance is a `HighValueCampaign` when it is a `Campaign` AND satisfies `budget > 10000`.

### 7. Write tool maps (one per tool)

```rel
map meta-ads {
  Campaign -> AdSet
  Campaign.budget -> AdSet.daily_budget
  Campaign.start-date -> AdSet.start_time
  Channel -> implicit   // inferred from placement, no direct API object
}
```

Rules:
- Map every base entity to either an API object or `implicit`
- Map properties that have API equivalents
- `implicit` means the skill handles it without a direct object

### 8. Compile and validate

```
compile_ontology   # parse, type-check, write ONTOLOGY.md
validate_ontology  # check only, no output
get_concepts       # inspect the symbol table
```

---

## Validation rules

| Severity | Check | Meaning |
|----------|-------|---------|
| error | Type Reference | property type or identified-by type is not declared |
| error | Extends Reference | derived entity extends an undeclared entity |
| error | Map Reference | map references an undeclared concept or property |
| error | Constraint Expression | constraint expression references undeclared property |
| warning | Relation Target | relation target not declared in this ontology |
| warning | Constraint Expression | identifier in expression is unrecognized (may be external) |
| gap | Map Coverage | a base entity has no entry in a map |

**Verdict:** `VALID` | `VALID-WITH-WARNINGS` | `INVALID`

Errors block compilation. Warnings and gaps do not.

---

## Common patterns

### External runtime references in constraints

`today`, `now`, `current-user` are valid in expressions even though they're not declared properties. The checker will warn but compilation succeeds.

```rel
entity StaleActiveCampaign extends Campaign {
  where: end-date < today and budget > 0
}
```

### Multiple maps for multiple tools

Put each tool map in its own `.rel` file:

```
maps/
  meta-ads.rel
  google-ads.rel
```

The checker validates that every base entity has a map entry in each map. Gaps are reported as `gap` findings.

### Splitting a large ontology

Use multiple `.rel` files — all files in the workspace are loaded together as one program. Cross-file references work (declare type in `core.rel`, use in `relationships.rel`).

---

## Retrofitting existing OAA nodes

Once the ontology compiles VALID, update tool node frontmatter to reference ontology concept names in their `concept-map` field:

```yaml
# tool-meta-ads-campaigns.md
kind: tool
name: meta-ads-campaigns
concept-map: meta-ads          # references the map tool name in ontology
authority:
  manages: [Campaign]          # now uses business concept names
```

This is the bridge between the ontology and the agent graph.

---

## Anti-patterns to avoid

| Anti-pattern | Problem | Fix |
|---|---|---|
| `property campaign_id` in entity | API name in business layer | Use `property id : CampaignID` |
| `entity AdSet` | Tool-layer concept in business entity | Map it: `Campaign -> AdSet` |
| `property daily_budget` | API field name | `property budget : Currency`, then map `Campaign.budget -> AdSet.daily_budget` |
| Editing `ONTOLOGY.md` by hand | Will be overwritten on next compile | Edit `.rel` source files |
| Writing all declarations in one file | Hard to navigate | Split by concern: types, entities, maps |

---

## Example: customer acquisition ontology

See `contrib/example-ontology/customer-acquisition.rel` for a full working example with:
- Scalar type aliases
- Enumeration
- Two base entities with properties, relations, constraints
- Two derived entities
- One tool map with object, field, and implicit entries
