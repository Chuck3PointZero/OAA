# Business Domain Ontology

> **Generated artifact** — compiled from `.rel` source files on 2026-06-13T19:31:18.639Z.
> Do not edit by hand. Edit the source files and run `compile_ontology`.

This ontology defines the canonical vocabulary for this organization's business domain. OAA agent roles, skills, and authority fields reference these concept names. Tool nodes provide the mapping from business names to API vocabulary via `concept-map` declarations.

## Contents

- [Entities](#entities)
- [Derived Concepts](#derived-concepts)
- [Value Types and Enumerations](#value-types-and-enumerations)
- [Tool Vocabulary Maps](#tool-vocabulary-maps)
- [Quick Reference](#quick-reference)

---

## Entities

### Campaign
<a id="campaign"></a>

targeting toward a specific objective.

**Identity key:** `CampaignID`

**Properties:**

| Name | Type | Constraint | Description |
|------|------|------------|-------------|
| `budget` | Currency |  |  |
| `objective` | CampaignObjective |  |  |
| `start-date` | Date |  |  |
| `end-date` | Date |  |  |

**Relationships:**

| Name | Target | Cardinality | Description |
|------|--------|-------------|-------------|
| `runs-on` | [Channel](#channel) | `many-to-many` |  |
| `targets` | [Audience](#audience) | `many-to-many` |  |

**Integrity constraints:**

- `valid-dates`: `start-date <= end-date`

### Channel
<a id="channel"></a>

A Channel is a delivery surface — search, social, display, etc.

**Identity key:** `ChannelID`

**Properties:**

| Name | Type | Constraint | Description |
|------|------|------------|-------------|
| `name` | String |  |  |

### Audience
<a id="audience"></a>

An Audience is a first- or third-party segment used for targeting.

**Identity key:** `AudienceID`

**Properties:**

| Name | Type | Constraint | Description |
|------|------|------------|-------------|
| `name` | String |  |  |
| `size` | Integer |  |  |

## Derived Concepts

Derived concepts are subtypes defined by logical rules over base entities. An instance belongs to a derived concept when its base entity satisfies the `where` clause.

### HighValueCampaign
<a id="highvaluecampaign"></a>

Derived: campaigns with budget above the high-value threshold.

**Extends:** [Campaign](#campaign)

**Rule:** An instance is a `HighValueCampaign` when `budget > 10000`

### StaleActiveCampaign
<a id="staleactivecampaign"></a>

Derived: campaigns past their end date that are still spending.

**Extends:** [Campaign](#campaign)

**Rule:** An instance is a `StaleActiveCampaign` when `end-date < today and budget > 0`

## Value Types and Enumerations

### Scalar Types

| Name | Base Type | Description |
|------|-----------|-------------|
| `CampaignID` | String | Swap the meta-ads map for any other ad platform without changing roles or skills. |
| `ChannelID` | String |  |
| `AudienceID` | String |  |

### Enumerations

**CampaignObjective**

Values: `awareness`, `conversion`, `retention`, `reactivation`

## Tool Vocabulary Maps

Business concept names map to API vocabulary for each tool. This is the **only** place API names appear — everything above uses business terms.

### meta-ads

To switch to Google Ads, replace this block only — concepts stay identical.

**Object type mappings:**

| Business Concept | API Object | Notes |
|-----------------|-----------|-------|
| `Campaign` | `AdSet` |  |
| `Audience` | `CustomAudience` |  |

**Field mappings:**

| Business Property | API Field | Notes |
|-------------------|----------|-------|
| `Campaign.budget` | `AdSet.daily_budget` |  |
| `Campaign.objective` | `AdSet.optimization_goal` |  |
| `Campaign.start-date` | `AdSet.start_time` |  |
| `Campaign.end-date` | `AdSet.end_time` |  |

**Implicit mappings** (no direct API object — handled in skill logic):

- `Channel`

## Quick Reference

| Concept | Kind | Description |
|---------|------|-------------|
| [Campaign](#campaign) | entity | targeting toward a specific objective. |
| [Channel](#channel) | entity | A Channel is a delivery surface — search, social, display, etc. |
| [Audience](#audience) | entity | An Audience is a first- or third-party segment used for targeting. |
| [HighValueCampaign](#highvaluecampaign) | derived (extends Campaign) | Derived: campaigns with budget above the high-value threshold. |
| [StaleActiveCampaign](#staleactivecampaign) | derived (extends Campaign) | Derived: campaigns past their end date that are still spending. |
