// Shared portfolio vocabulary: workflow stages, statuses, and record shapes.

export const stages = [
  "Problem Articulation",
  "Scouting",
  "POC",
  "Deployment Planning",
  "Deployment Execution",
  "Measuring Success",
];

export const statuses = ["Green", "Amber", "Red", "Blocked", "Completed"];
export const priorities = ["Low", "Medium", "High", "Strategic"];
export const products = ["Cargo Insurance", "Value Protect", "Customs", "Routing", "Forwarding", "CRM", "AI Literacy", "Network Optimization", "Other"];
export const recommendations = [
  "Continue Articulation",
  "Prioritize for Scouting",
  "Continue Scouting",
  "Select for PoC",
  "Iterate PoC",
  "Graduate to Deployment",
  "Park",
  "Kill",
];

export const pocOutcomes = ["Pending", "Success", "Partial", "Failed"];

export const stageMigrationMap = {
  Idea: "Problem Articulation",
  Discovery: "Problem Articulation",
  Qualification: "Scouting",
  PoC: "POC",
  Pilot: "Deployment Planning",
  Scale: "Deployment Execution",
  Closed: "Measuring Success",
};

export const recommendationMigrationMap = {
  "Continue Discovery": "Continue Articulation",
  "Move to PoC": "Select for PoC",
  "Move to Pilot": "Graduate to Deployment",
  Scale: "Graduate to Deployment",
};

export const STATUS_BAR = {
  Green: { bar: "bg-emerald-500", soft: "bg-emerald-100", text: "text-emerald-700", hex: "#10b981" },
  Amber: { bar: "bg-amber-500", soft: "bg-amber-100", text: "text-amber-700", hex: "#f59e0b" },
  Red: { bar: "bg-rose-500", soft: "bg-rose-100", text: "text-rose-700", hex: "#f43f5e" },
  Blocked: { bar: "bg-slate-500", soft: "bg-slate-200", text: "text-slate-700", hex: "#64748b" },
  Completed: { bar: "bg-sky-500", soft: "bg-sky-100", text: "text-sky-700", hex: "#0ea5e9" },
};

export const CHART_COLORS = {
  brand: "#0B5FB0",
  brandLight: "#4D93F0",
  brandSoft: "#B6D6FF",
  emerald: "#10b981",
  amber: "#f59e0b",
  rose: "#f43f5e",
  sky: "#0ea5e9",
  slate: "#64748b",
  violet: "#8b5cf6",
};

export const emptyProject = {
  name: "",
  productArea: "AI Literacy",
  owner: "",
  dateRequested: "",
  businessFunction: "",
  stakeholderName: "",
  regionScope: "",
  stage: "Problem Articulation",
  status: "Green",
  priority: "Medium",
  targetDate: "",
  nextMilestone: "",
  recommendation: "Continue Articulation",
  problem: "",
  impact: "",
  financialImpact: "",
  objectivePrimary: "",
  objectiveSecondary: "",
  currentChallenges: "",
  previousSolutions: "",
  dreamScenario: "",
  implementationRisks: "",
  resourcesRequired: "",
  scalabilityVision: "",
  curatedVendors: [],
  selectedVendors: [],
  demoVendors: [],
  vendorEvaluations: [],
  selectedVendor: "",
  strategicAlignment: "",
  timeToMarket: "",
  capabilitiesFit: "",
  partnerSummary: "",
  value: "",
  blockers: "",
  notes: "",
  activity: [],
  tasks: [],
  documents: [],
  pocHypothesis: "",
  pocSuccessCriteria: [],
  pocStartDate: "",
  pocEndDate: "",
  pocBudget: "",
  pocSpend: "",
  pocOutcome: "Pending",
  pocLearnings: "",
};

export const emptyDecision = {
  project: "",
  decision: "",
  owner: "",
  due: "",
  recommendation: "Continue Articulation",
  finalDecision: "Pending",
  status: "Open",
  notes: "",
};
