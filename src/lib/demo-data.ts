/**
 * Fictional demo profile: Maya Chen, management consultant moving into AI product
 * management. Entirely invented — no real person's data.
 */

export const DEMO_EXPERIENCES = [
  {
    key: "consulting",
    row: {
      organisation: "Northbridge Consulting",
      title: "Senior Consultant",
      start_date: "2021-09-01",
      end_date: "2025-11-30",
      description:
        "Management consulting across digital transformation, operating model design and process automation for financial services and retail clients.",
      industry: "Management consulting",
      seniority: "Senior individual contributor / workstream lead",
    },
  },
  {
    key: "sidework",
    row: {
      organisation: "Independent",
      title: "Independent AI projects",
      start_date: "2024-03-01",
      end_date: null,
      description: "Self-directed AI and software side projects built outside client work.",
      industry: "Technology",
      seniority: "Solo builder",
    },
  },
] as const;

export const DEMO_EVIDENCE: Array<{
  experienceKey: string | null;
  row: Record<string, unknown>;
}> = [
  {
    experienceKey: "consulting",
    row: {
      title: "Led the operating-model workstream of a retail bank transformation",
      description:
        "A retail bank was consolidating three overlapping servicing teams. I ran the operating-model workstream inside a wider transformation programme.",
      context:
        "Three teams did overlapping work with inconsistent handoffs, and the client could not agree on a single target model.",
      user_role: "Workstream lead reporting to the engagement partner",
      actions:
        "Ran fortnightly steering sessions with five client stakeholders including two directors, structured the decision into three model options, built the comparison, and drove the final decision to sign-off.",
      outcome:
        "The client approved a single target operating model and began implementation in the following quarter.",
      metrics: "Consolidated 3 teams; decision reached in 7 weeks against a 12-week plan.",
      occurred_on: "2024-06-01",
      organisation: "Northbridge Consulting",
      source: "Client engagement",
      source_type: "employment",
      verification_type: "quantified",
      claimed_skills: ["Stakeholder Management", "Problem Framing", "Project Leadership"],
    },
  },
  {
    experienceKey: "consulting",
    row: {
      title: "Requirements definition for a claims automation platform",
      description:
        "Defined the functional requirements for an insurance claims automation platform ahead of vendor selection.",
      context:
        "The client had no documented requirements and vendors were quoting against guesses.",
      user_role: "Business analyst on a four-person team",
      actions:
        "Interviewed 14 claims handlers, mapped the as-is process, wrote 60+ requirements, and prioritised them with the claims operations lead.",
      outcome:
        "The requirements pack was used as the basis for vendor selection and the client shortlisted two vendors.",
      metrics: "14 interviews; 60+ documented requirements.",
      occurred_on: "2023-04-15",
      organisation: "Northbridge Consulting",
      source: "Client engagement",
      source_type: "employment",
      verification_type: "self-reported",
      claimed_skills: ["Business Analysis", "Prioritisation", "User Research"],
    },
  },
  {
    experienceKey: "consulting",
    row: {
      title: "Business case for a self-service portal",
      description:
        "Built the investment case for a customer self-service portal for a utilities client.",
      context: "The client needed board approval for a multi-year digital investment.",
      user_role: "Analyst owning the financial model",
      actions:
        "Built the cost/benefit model, ran sensitivity analysis on adoption assumptions, and presented to the client's finance director.",
      outcome: "The board approved the investment.",
      metrics: null,
      occurred_on: "2022-10-01",
      organisation: "Northbridge Consulting",
      source: "Client engagement",
      source_type: "employment",
      verification_type: "self-reported",
      claimed_skills: ["Business Case Development", "Business Analysis"],
    },
  },
  {
    experienceKey: "consulting",
    row: {
      title: "Mentored junior consultants",
      description: "I mentored junior consultants on the team.",
      context: null,
      user_role: null,
      actions: null,
      outcome: null,
      metrics: null,
      occurred_on: "2024-01-01",
      organisation: "Northbridge Consulting",
      source: null,
      source_type: "employment",
      verification_type: "self-reported",
      claimed_skills: ["Leadership"],
    },
  },
  {
    experienceKey: "sidework",
    row: {
      title: "Built and shipped an AI trip-planning prototype",
      description:
        "Designed and built a web app that turns a free-text travel brief into a day-by-day itinerary using a language model.",
      context:
        "I wanted to understand where language models are unreliable in a real product surface rather than in a demo.",
      user_role: "Sole designer, builder and product decision-maker",
      actions:
        "Scoped the problem, designed the flow, built the app, wrote the prompt/validation layer, and put it in front of 30 testers.",
      outcome:
        "30 people used it; I rewrote the itinerary step after testers repeatedly rejected over-packed days.",
      metrics: "30 testers; 2 major design changes driven by observed usage.",
      occurred_on: "2025-05-01",
      organisation: null,
      source: "Personal project",
      source_type: "personal project",
      verification_type: "published",
      claimed_skills: ["AI Product Development", "Product Strategy", "User Research"],
    },
  },
  {
    experienceKey: "sidework",
    row: {
      title: "Completed an SQL for analysts course",
      description:
        "Completed an online SQL course covering joins, aggregation and window functions.",
      context: null,
      user_role: "Learner",
      actions: "Completed the course exercises.",
      outcome: null,
      metrics: null,
      occurred_on: "2025-02-01",
      organisation: null,
      source: "Online course certificate",
      source_type: "certificate",
      verification_type: "self-reported",
      claimed_skills: ["SQL"],
    },
  },
  {
    experienceKey: "sidework",
    row: {
      title: "Internal AI tooling pilot for the consulting team",
      description:
        "Piloted a document-summarisation assistant for the consulting team's research workflow.",
      context: "Consultants spent hours summarising client documents before workshops.",
      user_role: "Initiator and builder; supported by the practice's data lead",
      actions:
        "Built the pilot, onboarded 8 colleagues, collected feedback, and presented results to the practice lead.",
      outcome: "The pilot was adopted by one team for ongoing use.",
      metrics: null,
      occurred_on: "2025-09-01",
      organisation: "Northbridge Consulting",
      source: "Internal pilot",
      source_type: "project",
      verification_type: "self-reported",
      claimed_skills: ["AI Product Development", "Stakeholder Management"],
    },
  },
];

export const DEMO_ROLE = {
  title: "AI Product Manager",
  company: "Lumen Labs (example)",
  source_url: null,
  seniority: "Mid-level",
  job_description: `AI Product Manager — Lumen Labs

About the role
We are looking for an AI Product Manager to own a customer-facing AI product area end to end. You will define the product strategy for your area, decide what we build next, and be accountable for the outcomes.

What you will do
- Own the roadmap for an AI product area and make prioritisation calls between competing bets.
- Work day to day with engineering, design, data science and go-to-market as the decision owner for your area.
- Define success metrics for every feature and report on them to leadership.
- Design and run experiments to validate product hypotheses before we invest in building.
- Talk to users regularly and turn what you learn into product decisions.
- Write clear specifications for AI features, including how the system should behave when the model is wrong.

What we are looking for
- Experience shipping software products, ideally including an ML or LLM-powered feature.
- Strong product analytics: you can define metrics, interrogate the data yourself, and know when a result is noise.
- Comfortable writing SQL to answer your own questions without waiting on an analyst.
- Experience running A/B tests or structured product experiments and acting on the results.
- Excellent written communication and the ability to influence senior stakeholders without authority.
- Understanding of how modern AI systems work and where they fail.

Nice to have
- Experience in a regulated industry.
- A background that combines commercial and technical work.`,
};
