# Skill Observation Log

Observations captured during task-oriented work.

**Status key:** OPEN = not yet actioned | ACTIONED (YYYY-MM-DD) = skill
updated/created | DECLINED (YYYY-MM-DD) = user decided not to pursue —
resolved statuses always carry their resolution date

---

## 2026-08-12

### Observation 1: Compare generated design tokens with the existing product before persisting

**Status:** OPEN
**Date:** 2026-08-12
**Session context:** Established UI/UX direction for an existing web product.
**Skill:** ui-ux-pro-max
**Type:** open-source
**Phase/Area:** Design-system generation and persistence

**Issue:** The generated palette and typography can diverge sharply from an established product's live tokens. Persisting it as the master design system without a compatibility check can turn a useful exploration into an accidental visual rewrite.

**Suggested improvement:** Add an explicit pre-persist comparison step for existing projects: inspect the live token file, state whether the generated system is a replacement, a selective source of ideas, or incompatible, and only then persist.

**Principle:** Generated design direction must respect an existing visual system unless the task explicitly authorises a rebrand.
