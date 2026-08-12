/**
 * SkillNormalizer — deterministic canonicalisation so "stakeholder engagement",
 * "Stakeholder relations" and "stakeholder management" all resolve to one skill.
 * Semantic matching is done by the AI services; this layer stops trivial
 * variations from fragmenting the skill graph.
 */

const ALIAS_GROUPS: Record<string, string[]> = {
  "Stakeholder Management": [
    "stakeholder engagement",
    "stakeholder relations",
    "stakeholder communication",
    "stakeholder alignment",
    "managing stakeholders",
    "cross functional collaboration",
    "cross-functional collaboration",
  ],
  "Product Strategy": ["product vision", "strategy", "roadmapping", "product roadmap", "roadmap"],
  "Product Analytics": [
    "analytics",
    "data analysis for product",
    "metrics analysis",
    "kpi analysis",
  ],
  "Product Experimentation": [
    "experimentation",
    "a/b testing",
    "ab testing",
    "hypothesis testing",
    "growth experiments",
  ],
  "User Research": ["customer research", "user interviews", "discovery research", "ux research"],
  "Business Analysis": ["requirements gathering", "requirements analysis", "business analyst"],
  "Project Leadership": [
    "project management",
    "programme management",
    "program management",
    "delivery management",
  ],
  "Problem Framing": ["problem definition", "problem structuring", "issue framing"],
  SQL: ["sql queries", "postgresql", "writing sql", "structured query language"],
  "Machine Learning": ["ml", "machine-learning", "applied ml"],
  "AI Product Development": [
    "ai products",
    "llm products",
    "genai product",
    "ai product management",
  ],
  Prioritisation: ["prioritization", "backlog prioritisation", "backlog prioritization"],
  Communication: ["written communication", "verbal communication", "presentation skills"],
  "Business Case Development": ["business casing", "roi analysis", "value case"],
};

const ALIAS_LOOKUP: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const [canonical, aliases] of Object.entries(ALIAS_GROUPS)) {
    map[normalise(canonical)] = canonical;
    for (const alias of aliases) map[normalise(alias)] = canonical;
  }
  return map;
})();

function normalise(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9+#. ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function canonicalSkillName(raw: string): string {
  const key = normalise(raw);
  const known = ALIAS_LOOKUP[key];
  if (known) return known;
  return raw
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

export function skillSlug(raw: string): string {
  return normalise(canonicalSkillName(raw)).replace(/ /g, "-");
}

export function aliasesFor(canonical: string): string[] {
  return ALIAS_GROUPS[canonical] ?? [];
}
