// Shared helpers for dates, health, stage gates, vendors, and tasks.

import { stages } from "./constants.js";

export function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

export function parseDate(value) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function daysUntil(value) {
  const date = parseDate(value);
  if (!date) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((date.getTime() - today.getTime()) / 86400000);
}

export function formatRelative(value) {
  const days = daysUntil(value);
  if (days === null) return "No date";
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `Due in ${days}d`;
}

export function startOfDay(date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function addMonths(date, count) {
  return new Date(date.getFullYear(), date.getMonth() + count, 1);
}

export function monthsBetween(start, end) {
  return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
}

export function formatShortDate(value) {
  const date = parseDate(value);
  if (!date) return "—";
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

// Maps a date onto an x offset where each month occupies exactly monthWidth px,
// so bars stay aligned with the uniform month gridlines regardless of month length.
export function dateToOffset(date, rangeStart, monthWidth) {
  const monthIndex = monthsBetween(rangeStart, date);
  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const fraction = (date.getDate() - 1) / daysInMonth;
  return (monthIndex + fraction) * monthWidth;
}

export function getProjectHealth(project) {
  const days = daysUntil(project.targetDate);
  if (project.status === "Blocked" || project.status === "Red") return "critical";
  if (days !== null && days < 0) return "critical";
  if (days !== null && days <= 7) return "watch";
  return "stable";
}

export function nextStage(stage) {
  const index = stages.indexOf(stage);
  if (index < 0 || index >= stages.length - 1) return null;
  return stages[index + 1];
}

export function getStageDecisionGuide(project, stage, relatedDecisions) {
  const guides = {
    "Problem Articulation": {
      title: "Can this move into scouting?",
      decision: "Confirm the problem is specific, material, and owned by the business.",
      required: [
        ["problem", "Problem statement"],
        ["impact", "Operational impact"],
        ["financialImpact", "Financial impact"],
        ["objectivePrimary", "Primary objective"],
      ],
    },
    "Scouting": {
      title: "Is the opportunity ready for solution scouting?",
      decision: "Validate the current state, failure points, and why existing approaches are insufficient.",
      required: [
        ["currentChallenges", "Current challenges"],
        ["previousSolutions", "Previous solutions tested"],
        ["blockers", "Key blockers"],
      ],
    },
    "POC": {
      title: "Is this ready for a proof of concept?",
      decision: "Confirm the target solution, risks, and what support is needed to run a focused test.",
      required: [
        ["dreamScenario", "Target solution"],
        ["pocHypothesis", "PoC hypothesis"],
        ["pocSuccessCriteria", "PoC success criteria"],
        ["resourcesRequired", "Resources required"],
        ["implementationRisks", "Implementation risks"],
        ["value", "Expected value"],
      ],
    },
    "Deployment Planning": {
      title: "Can this transition into implementation planning?",
      decision: "Lock the recommendation, target timeline, and operational milestone for rollout.",
      required: [
        ["recommendation", "Recommendation"],
        ["nextMilestone", "Next milestone"],
        ["targetDate", "Target date"],
      ],
    },
    "Deployment Execution": {
      title: "Is execution under control?",
      decision: "Monitor whether blockers, milestones, and open approvals are under active management.",
      required: [
        ["blockers", "Execution blockers"],
        ["nextMilestone", "Current milestone"],
      ],
    },
    "Measuring Success": {
      title: "Can the outcome be measured and scaled?",
      decision: "Confirm the realized value, financial impact, and scale pathway after delivery.",
      required: [
        ["financialImpact", "Financial impact"],
        ["scalabilityVision", "Scalability vision"],
        ["value", "Expected value"],
      ],
    },
  };

  const guide = guides[stage];
  const missing = guide.required.filter(([key]) => !hasValue(project[key])).map(([, label]) => label);
  const readiness = missing.length === 0 ? "Ready" : missing.length <= 2 ? "Needs review" : "Not ready";

  return {
    ...guide,
    missing,
    readiness,
    openDecisionCount: relatedDecisions.length,
  };
}

export function getStageRequirements(stage) {
  const requirements = {
    "Problem Articulation": [
      ["name", "Project name"],
      ["owner", "Owner"],
      ["problem", "Problem statement"],
      ["impact", "Operational impact"],
      ["objectivePrimary", "Primary objective"],
    ],
    "Scouting": [
      ["currentChallenges", "Current challenges"],
      ["previousSolutions", "Previous solutions tested"],
      ["curatedVendors", "Vendor longlist"],
      ["selectedVendors", "Shortlisted vendors"],
      ["vendorEvaluations", "Vendor scorecards"],
    ],
    "POC": [
      ["dreamScenario", "Target solution"],
      ["selectedVendor", "Selected vendor"],
      ["pocHypothesis", "PoC hypothesis"],
      ["pocSuccessCriteria", "PoC success criteria"],
      ["implementationRisks", "Implementation risks"],
      ["partnerSummary", "Partner recommendation summary"],
    ],
    "Deployment Planning": [
      ["recommendation", "Recommendation"],
      ["targetDate", "Target date"],
      ["nextMilestone", "Next milestone"],
    ],
    "Deployment Execution": [
      ["status", "Execution status"],
      ["blockers", "Execution blockers"],
      ["nextMilestone", "Current milestone"],
    ],
    "Measuring Success": [
      ["value", "Outcome value"],
      ["financialImpact", "Financial impact"],
      ["scalabilityVision", "Scalability vision"],
    ],
  };
  return requirements[stage] || [];
}

export function hasValue(value) {
  if (Array.isArray(value)) return value.length > 0;
  return String(value || "").trim().length > 0;
}

export function createActivityEntry(type, text) {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    text,
    at: new Date().toISOString(),
  };
}

export function scoreVendorEvaluation(evaluation) {
  const keys = ["strategicFit", "logisticsFit", "integrationFit", "securityReadiness", "speedToValue", "commercialFit"];
  const values = keys.map((key) => Number(evaluation?.[key] || 0)).filter((value) => value > 0);
  if (!values.length) return null;
  const total = values.reduce((sum, value) => sum + value, 0);
  return Number((total / values.length).toFixed(1));
}

export function getVendorLeaderboard(project) {
  return (project.vendorEvaluations || [])
    .map((evaluation) => ({
      ...evaluation,
      score: scoreVendorEvaluation(evaluation),
    }))
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
}

export function normalizeText(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function findProjectByName(projects, query) {
  const target = normalizeText(query);
  if (!target) return null;

  const exact = projects.find((project) => normalizeText(project.name) === target);
  if (exact) return exact;

  const partial = projects.find((project) => normalizeText(project.name).includes(target) || target.includes(normalizeText(project.name)));
  return partial || null;
}

export function getStageCompletion(project, stage) {
  const required = getStageRequirements(stage);
  const completed = required.filter(([key]) => hasValue(project[key])).length;
  const total = required.length;
  return {
    completed,
    total,
    percent: total ? Math.round((completed / total) * 100) : 0,
  };
}

export function getTaskProgress(project) {
  const tasks = project.tasks || [];
  const done = tasks.filter((task) => task.done).length;
  return {
    done,
    total: tasks.length,
    percent: tasks.length ? Math.round((done / tasks.length) * 100) : 0,
  };
}

// Pulls a usable number out of loosely formatted budget strings ("$25,000", "25k").
export function parseAmount(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim().toLowerCase();
  if (!text) return null;
  const match = text.replace(/[, ]/g, "").match(/(\d+(?:\.\d+)?)(k|m)?/);
  if (!match) return null;
  let amount = Number(match[1]);
  if (match[2] === "k") amount *= 1000;
  if (match[2] === "m") amount *= 1000000;
  return Number.isFinite(amount) ? amount : null;
}

export function formatAmount(value) {
  const amount = typeof value === "number" ? value : parseAmount(value);
  if (amount === null) return "—";
  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(amount % 1000000 === 0 ? 0 : 1)}M`;
  if (amount >= 1000) return `$${(amount / 1000).toFixed(amount % 1000 === 0 ? 0 : 1)}k`;
  return `$${amount}`;
}

export function getPocCriteriaProgress(project) {
  const criteria = project.pocSuccessCriteria || [];
  const met = criteria.filter((item) => item.met).length;
  return {
    met,
    total: criteria.length,
    percent: criteria.length ? Math.round((met / criteria.length) * 100) : 0,
  };
}

// Aggregated readiness signal for a running PoC: combines criteria progress,
// timeline pressure, and explicit outcome into a single label.
export function getPocSignal(project) {
  if (project.pocOutcome === "Success") return { label: "Go", tone: "stable" };
  if (project.pocOutcome === "Failed") return { label: "No-go", tone: "critical" };
  if (project.pocOutcome === "Partial") return { label: "Iterate", tone: "watch" };
  const progress = getPocCriteriaProgress(project);
  const daysLeft = daysUntil(project.pocEndDate);
  if (progress.total > 0 && progress.met === progress.total) return { label: "Go signal", tone: "stable" };
  if (daysLeft !== null && daysLeft < 0) return { label: "Overrunning", tone: "critical" };
  if (daysLeft !== null && daysLeft <= 7 && progress.percent < 60) return { label: "At risk", tone: "watch" };
  return { label: "Running", tone: "default" };
}
