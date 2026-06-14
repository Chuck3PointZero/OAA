# Business Domain Ontology

> **Generated artifact** — compiled from `.onto.yaml` source files on 2026-06-13T18:48:12.771Z.
> Do not edit by hand. Edit the source files and run compile_ontology.

This ontology defines the canonical vocabulary for this organization's business domain. All OAA agent roles, skills, and authority fields reference these concept names. Tool nodes provide the mapping from these business names to API vocabulary.

## Contents

- [Customer Acquisition](#customer-acquisition)
- [Tool Vocabulary Mappings](#tool-vocabulary-mappings)
- [Quick Reference](#quick-reference)

---

## Customer Acquisition
<a id="customer-acquisition"></a>

Example domain for a business that acquires customers through paid channels. Covers campaigns, spend, creatives, audiences, and acquisitions. All concept names are business vocabulary — channel-agnostic.

### Campaign

A coordinated marketing effort with a defined budget, objective, and schedule.

**Identity:** `campaign-id`

**Properties:**

| Name | Type | Description |
|------|------|-------------|
| `budget` | currency | Total allocated spend in reporting currency. |
| `objective` | enum[awareness, conversion, retention, reactivation] | The business goal this campaign serves. |
| `status` | enum[draft, active, paused, completed] |  |
| `start-date` | date |  |
| `end-date` | date |  |

**Relationships:**

| Name | To | Cardinality | Description |
|------|----|-------------|-------------|
| `runs-on` | [Channel](#channel) | many-to-many | The delivery channels this campaign uses. |
| `targets` | [Audience](#audience) | many-to-many |  |
| `produces` | [CustomerAcquisition](#customeracquisition) | one-to-many |  |

### Channel

A delivery mechanism for marketing content. Channel-agnostic — Meta, Google, email are all Channels.

**Identity:** `channel-name`

**Properties:**

| Name | Type | Description |
|------|------|-------------|
| `name` | string |  |
| `type` | enum[paid-social, paid-search, email, sms, display] |  |

### Creative

A piece of marketing content used in campaigns.

**Identity:** `creative-id`

**Properties:**

| Name | Type | Description |
|------|------|-------------|
| `format` | enum[image, video, carousel, text] |  |
| `headline` | string |  |
| `body-copy` | string |  |
| `status` | enum[draft, active, fatigued, retired] |  |

**Relationships:**

| Name | To | Cardinality | Description |
|------|----|-------------|-------------|
| `used-by` | [Campaign](#campaign) | many-to-many |  |

### Audience

A segment of potential customers targeted by campaigns.

**Identity:** `audience-id`

**Properties:**

| Name | Type | Description |
|------|------|-------------|
| `size` | integer |  |
| `source` | enum[email-list, lookalike, interest, remarketing] |  |

### MarketingSpend

Money committed to a campaign on a channel in a reporting period.

**Identity:** `campaign-id + channel-name + period`

**Properties:**

| Name | Type | Description |
|------|------|-------------|
| `amount` | currency |  |
| `period` | date-period |  |

**Relationships:**

| Name | To | Cardinality | Description |
|------|----|-------------|-------------|
| `for-campaign` | [Campaign](#campaign) | many-to-one |  |
| `on-channel` | [Channel](#channel) | many-to-one |  |

### CustomerAcquisition

A new customer obtained through a marketing campaign.

**Identity:** `acquisition-id`

**Properties:**

| Name | Type | Description |
|------|------|-------------|
| `cost` | currency | Cost per acquisition (CPA). |
| `acquired-at` | datetime |  |

**Relationships:**

| Name | To | Cardinality | Description |
|------|----|-------------|-------------|
| `from-campaign` | [Campaign](#campaign) | many-to-one |  |
| `via-channel` | [Channel](#channel) | many-to-one |  |

---

## Tool Vocabulary Mappings

This section shows how business concept names translate to API vocabulary for each tool. All names above this section are business names. These mappings are the only place API names appear.

### meta-ads

**Channel:** Meta (Facebook/Instagram)

**Object type mappings:**

| Business Concept | API Object Type |
|-----------------|----------------|
| Campaign | `AdSet` |
| Creative | `AdCreative` |
| Audience | `CustomAudience` |
| MarketingSpend | `AdInsights` |
| CustomerAcquisition | `AdInsights` |

**Property field mappings:**

| Business Property | API Field |
|-------------------|-----------|
| `Campaign.budget` | `AdSet.daily_budget` |
| `Campaign.objective` | `AdSet.objective` |
| `Campaign.status` | `AdSet.effective_status` |
| `Campaign.start-date` | `AdSet.start_time` |
| `Campaign.end-date` | `AdSet.end_time` |
| `Creative.format` | `AdCreative.object_type` |
| `Creative.headline` | `AdCreative.title` |
| `Creative.body-copy` | `AdCreative.body` |
| `Creative.status` | `AdCreative.effective_object_story_id` |
| `MarketingSpend.amount` | `AdInsights.spend` |
| `MarketingSpend.period` | `AdInsights.date_start` |
| `CustomerAcquisition.cost` | `AdInsights.cost_per_result` |
| `CustomerAcquisition.acquired-at` | `AdInsights.date_start` |

_Unmapped concepts (no direct API equivalent in this tool): Channel_

**Notes:**

> Meta does not expose a native Audience object that maps cleanly to our Audience concept. Audiences are CustomAudiences (remarketing/lookalike) or targeting specs (interest-based). Channel has no direct API equivalent — it is implicit in the Meta account itself. The meta-ads skill handles Channel → Platform translation in its targeting workflows.

## Quick Reference

| Concept | Domain | Description |
|---------|--------|-------------|
| [Campaign](#campaign) | customer-acquisition | A coordinated marketing effort with a defined budget, objective, and schedule. |
| [Channel](#channel) | customer-acquisition | A delivery mechanism for marketing content. Channel-agnostic — Meta, Google, email are all Channels. |
| [Creative](#creative) | customer-acquisition | A piece of marketing content used in campaigns. |
| [Audience](#audience) | customer-acquisition | A segment of potential customers targeted by campaigns. |
| [MarketingSpend](#marketingspend) | customer-acquisition | Money committed to a campaign on a channel in a reporting period. |
| [CustomerAcquisition](#customeracquisition) | customer-acquisition | A new customer obtained through a marketing campaign. |
