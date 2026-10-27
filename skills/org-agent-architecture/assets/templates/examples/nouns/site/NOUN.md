---
type: oaa/Noun
kind: noun
name: site
description: The web site this company watches.
system-of-record: the SITE_URL setting of the site-probe tool
states: [up, down]
relationships:
  distinct-from: [status-note]
---

# Noun: Site

The one page the probe fetches. "Down" means two failed checks in a row, not one.
