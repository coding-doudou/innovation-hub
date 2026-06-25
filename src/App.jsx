import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  Bot,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Brain,
  ClipboardCheck,
  Download,
  ExternalLink,
  Flag,
  FlaskConical,
  FolderKanban,
  Kanban,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Paperclip,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Target,
  Trash2,
  Upload,
  User,
} from "lucide-react";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip as ChartTooltip } from "recharts";
import { repository } from "./data/repository.js";
import { putDoc, getDoc, deleteDoc } from "./lib/docStore.js";
import { isRemoteBackend } from "./config.js";
import { initAuth, login, logout, getActiveAccount } from "./auth/msalClient.js";
import {
  stages,
  statuses,
  priorities,
  products,
  recommendations,
  pocOutcomes,
  stageMigrationMap,
  recommendationMigrationMap,
  STATUS_BAR,
  emptyProject,
  emptyDecision,
} from "./lib/constants.js";
import {
  cx,
  parseDate,
  daysUntil,
  formatRelative,
  startOfDay,
  startOfMonth,
  addMonths,
  monthsBetween,
  formatShortDate,
  dateToOffset,
  getProjectHealth,
  nextStage,
  getStageDecisionGuide,
  getStageRequirements,
  hasValue,
  createActivityEntry,
  getVendorLeaderboard,
  findProjectByName,
  getStageCompletion,
  getTaskProgress,
  getPocCriteriaProgress,
  formatAmount,
  parseAmount,
} from "./lib/utils.js";
import {
  Badge,
  Card,
  Button,
  Input,
  Textarea,
  Select,
  Field,
  Modal,
  MetricCard,
  EmptyState,
  StagePanel,
  MiniTable,
  EditableTable,
} from "./components/ui.jsx";
import BoardView from "./views/BoardView.jsx";
import PocView from "./views/PocView.jsx";
import AnalyticsView from "./views/AnalyticsView.jsx";
import CommandPalette from "./components/CommandPalette.jsx";

const STORAGE_KEYS = {
  projects: "iph_projects",
  decisions: "iph_decisions",
};

const sampleProjects = [
  {
    id: 1,
    name: "Warehouse Safety Event Detection",
    productArea: "Other",
    owner: "Maurice Simpson",
    dateRequested: "2025-04-07",
    businessFunction: "Warehouse Safety / Security",
    stakeholderName: "Maurice Simpson",
    regionScope: "USA / NAM",
    stage: "Problem Articulation",
    status: "Amber",
    priority: "Strategic",
    nextMilestone: "Confirm pilot site and baseline AFR / IFIR data",
    targetDate: "2026-06-12",
    recommendation: "Prioritize for Scouting",
    problem: "Warehouse teams rely heavily on manual reporting to capture incidents, near misses, and safety events. That creates incomplete visibility, slower response, and inconsistent measurement across sites.",
    impact: "Current reporting makes it difficult to quantify incident frequency accurately, compare facilities on a like-for-like basis, and proactively intervene before events escalate.",
    financialImpact: "Accident claims are estimated around USD 35k-40k per worker case, while broader event costs are not consistently tracked.",
    objectivePrimary: "Improve the accuracy and completeness of safety event reporting to reduce incidents, near misses, and accidents across warehouse operations.",
    objectiveSecondary: "Establish clearer financial visibility into the cost of warehouse safety incidents and near misses.",
    currentChallenges: "Human-submitted observations and equipment alerts do not provide full coverage. Reporting is reactive and site leaders may miss or misclassify events.",
    previousSolutions: "No dedicated technology has been implemented yet; AFR / IFIR style reporting exists but remains reactive.",
    dreamScenario: "Computer vision-based detection with real-time alerts, more reliable event capture, and a stronger basis for prevention and operational follow-up.",
    implementationRisks: "Need operator and customer buy-in, clean baseline data, and a clear path to quantify ROI across facilities.",
    resourcesRequired: "External enablement and training for local teams using the solution.",
    scalabilityVision: "Start in NAM warehouses and extend to additional regions once the model and operating process are proven.",
    value: "Better event visibility, faster intervention, lower incident frequency, and stronger safety governance.",
    blockers: "Baseline event quality and financial impact data are still fragmented.",
    notes: "Derived from the warehouse safety / security discovery form example with regional applicability for NAM and broader rollout potential.",
    tasks: [
      { id: "wsd-t1", title: "Confirm pilot site shortlist with NAM ops", owner: "Maurice Simpson", due: "2026-06-12", done: false },
      { id: "wsd-t2", title: "Pull 12-month AFR / IFIR baseline data", owner: "Safety Analytics", due: "2026-06-19", done: false },
    ],
  },
  {
    id: 2,
    name: "AI Literacy Mapping for Leadership",
    productArea: "AI Literacy",
    owner: "Doudou BA",
    stage: "Problem Articulation",
    status: "Green",
    priority: "Strategic",
    nextMilestone: "Review process and first prototype",
    targetDate: "2026-06-10",
    recommendation: "Prioritize for Scouting",
    problem: "Leadership teams need a structured view of AI literacy gaps and targeted upskilling needs.",
    value: "Better AI adoption readiness and targeted upskilling for senior leaders.",
    blockers: "Need alignment on evaluation dimensions.",
    notes: "Stakeholders: Yujie Su, Cyber Risk team, business leaders.",
  },
  {
    id: 3,
    name: "Cargo Insurance Tech Assessment",
    productArea: "Cargo Insurance",
    owner: "CRM Innovation Lead",
    stage: "Scouting",
    status: "Amber",
    priority: "High",
    nextMilestone: "Prioritize top 3 insurance use cases",
    targetDate: "2026-06-14",
    recommendation: "Select for PoC",
    problem: "Cargo insurance teams need clearer visibility on technology opportunities across claims, pricing, and risk assessment.",
    value: "Potential reduction in claim handling time and improved risk prediction.",
    blockers: "Data access and ownership.",
    notes: "Shortlist internal prototype vs vendor-led PoC.",
  },
  {
    id: 4,
    name: "Network Optimization AI",
    productArea: "Network Optimization",
    owner: "OR Team",
    stage: "POC",
    status: "Green",
    priority: "Strategic",
    nextMilestone: "Benchmark against historical scenario",
    targetDate: "2026-06-05",
    recommendation: "Graduate to Deployment",
    problem: "Operational teams need faster scenario evaluation for routing, cost, service, and capacity trade-offs.",
    value: "Higher quality decisions in network planning and potential cost reduction.",
    blockers: "Need clean scenario data and accepted baseline metrics.",
    notes: "Pilot lane approval needed after benchmark.",
    selectedVendor: "Internal OR Platform",
    pocHypothesis: "An AI-assisted scenario engine can cut network planning evaluation time by 60% while matching expert planner quality on cost and service trade-offs.",
    pocSuccessCriteria: [
      { id: "noa-c1", text: "Benchmark scenario completes in under 4 hours vs 2-day baseline", met: true },
      { id: "noa-c2", text: "Cost recommendations within 2% of expert planner output", met: true },
      { id: "noa-c3", text: "Planners rate usability 4/5 or higher in structured feedback", met: false },
      { id: "noa-c4", text: "Scenario data pipeline refreshes without manual cleanup", met: false },
    ],
    pocStartDate: "2026-04-20",
    pocEndDate: "2026-07-15",
    pocBudget: "40000",
    pocSpend: "16500",
    pocOutcome: "Pending",
    tasks: [
      { id: "noa-t1", title: "Lock benchmark scenario dataset", owner: "OR Team", due: "2026-06-05", done: true },
      { id: "noa-t2", title: "Run side-by-side planner comparison", owner: "OR Team", due: "2026-06-20", done: false },
      { id: "noa-t3", title: "Collect planner usability feedback", owner: "OR Team", due: "2026-06-28", done: false },
    ],
  },
  {
    id: 5,
    name: "Customs Automation Opportunity",
    productArea: "Customs",
    owner: "Customs Product Team",
    stage: "Problem Articulation",
    status: "Blocked",
    priority: "Medium",
    nextMilestone: "Map top manual customs pain points",
    targetDate: "2026-06-08",
    recommendation: "Continue Articulation",
    problem: "Customs workflows involve repetitive document checks and declaration quality controls.",
    value: "Reduced manual work and fewer declaration errors.",
    blockers: "Process varies across markets.",
    notes: "Need market-specific process owners.",
  },
  {
    id: 6,
    name: "Customer Facing Conversational AI",
    productArea: "Customs",
    owner: "Nicoloe Stojeski",
    dateRequested: "2025-08-05",
    businessFunction: "Global Customs Services",
    stakeholderName: "Nicoloe Stojeski",
    regionScope: "Global",
    stage: "Problem Articulation",
    status: "Amber",
    priority: "Strategic",
    targetDate: "2026-06-30",
    nextMilestone: "Validate churn exposure, define V1 Track scope, and align AI pilot requirements",
    recommendation: "Prioritize for Scouting",
    problem: "Major clients, including Living Spaces and Williams Sonoma, have signaled dissatisfaction with outdated customer-facing customs technology. To retain and grow these accounts, the business needs a more modern, AI-powered self-service experience that reduces friction and demonstrates visible product leadership.",
    impact: "The opportunity is tied to customer churn reduction, stronger self-service experiences, improved market perception of innovation, and higher retention and loyalty across customs services.",
    financialImpact: "Estimated customer churn prevention opportunity of roughly USD 1M in NAM alone, with broader upside if the solution scales across additional markets and customer segments.",
    objectivePrimary: "Retain high-value customers by delivering a modern, AI-powered customer experience that builds confidence, showcases innovation, and reduces churn risk.",
    objectiveSecondary: "Reduce manual query handling through AI-powered self-service, shorten response times, increase customer satisfaction, reinforce Maersk's innovation brand, and create reusable capabilities across customs products.",
    currentChallenges: "Customer-facing customs products do not meet rising client expectations for speed, clarity, and digital self-service. Existing tools are dated, response handling is manual, and there is no differentiated AI-enabled experience in place.",
    previousSolutions: "No previous solutions tested.",
    dreamScenario: "Launch a first-wave AI-powered customs experience inside V1 Track, then extend it into a scalable conversational layer across customs products. The target experience combines strong self-service, customer support assistance, and reusable enterprise AI components.",
    implementationRisks: "Risk areas include alignment across tech, data, and product teams; access to accurate customs knowledge sources; dependency on vendor or platform choices; compliance and security constraints; and customer trust if the AI experience performs inconsistently.",
    resourcesRequired: "V1 Track support, a unified data foundation, relevant customs domain content, and NAM solution team support.",
    scalabilityVision: "Global",
    curatedVendors: [
      { cluster: "Business/Productivity Software", number: 1, vendorName: "Decagon", website: "https://decagon.ai/", origin: "United States", foundingYear: "2023", employees: "138", fundingRound: "Series C", description: "Conversational AI platform for customer support cost reduction and faster support workflows.", score: "", reasoning: "Relevance of the solution to the problem presented by the business." },
      { cluster: "Business/Productivity Software", number: 2, vendorName: "Amazon Bedrock", website: "https://aws.amazon.com/lex/", origin: "United States", foundingYear: "", employees: "", fundingRound: "Established", description: "Internal AI/ML platform option for conversational experiences.", score: "", reasoning: "Built for internal AI/ML teams." },
      { cluster: "Business/Productivity Software", number: 3, vendorName: "Sligo AI", website: "https://sligo.ai/", origin: "United States", foundingYear: "", employees: "", fundingRound: "", description: "Conversational AI vendor candidate for customer-facing interactions.", score: "", reasoning: "Relative maturity and fit versus other early-stage vendors." },
      { cluster: "Business/Productivity Software", number: 4, vendorName: "Bizagi", website: "https://www.bizagi.com/en", origin: "United Kingdom", foundingYear: "1989", employees: "449", fundingRound: "2ndary-Private", description: "Business process and workflow automation platform for digitization of enterprise processes.", score: "", reasoning: "Ease of understanding relevant product capability from website and business process fit." },
      { cluster: "Business/Productivity Software", number: 5, vendorName: "Sendbird", website: "https://sendbird.com/", origin: "United States", foundingYear: "2013", employees: "288", fundingRound: "2ndary-Private", description: "Messaging and chat APIs for digital customer communication.", score: "", reasoning: "Customer interaction capability and support use case relevance." },
      { cluster: "Automation/Workflow Software", number: 6, vendorName: "Beam.ai", website: "https://beam.ai/", origin: "United States", foundingYear: "2022", employees: "38", fundingRound: "Seed", description: "AI agent platform for repetitive back-office tasks and agentic workflow execution.", score: "", reasoning: "Workflow automation and support relevance." },
      { cluster: "Automation/Workflow Software", number: 7, vendorName: "Azumo", website: "https://azumo.com/", origin: "United States", foundingYear: "", employees: "101-250", fundingRound: "", description: "Software services company building intelligent applications, big data solutions, and chatbots.", score: "", reasoning: "Services-led route for custom solution build." },
      { cluster: "IT Consulting and Outsourcing", number: 8, vendorName: "Hatchworks", website: "https://hatchworks.com/", origin: "United States", foundingYear: "2016", employees: "90", fundingRound: "Seed", description: "Enterprise software and cloud application builder with product strategy and AI delivery capability.", score: "", reasoning: "Custom build and redesign support." },
      { cluster: "Automation/Workflow Solutions", number: 9, vendorName: "Tungsten Automation", website: "https://www.tungstenautomation.com/", origin: "United States", foundingYear: "1985", employees: "2100", fundingRound: "PE Growth", description: "Automation platform for information-intensive business processes and customer engagement.", score: "", reasoning: "Enterprise automation breadth." },
      { cluster: "Business/Productivity Software", number: 10, vendorName: "Copilot Studio", website: "https://learn.microsoft.com/en-us/microsoft-copilot-studio/", origin: "United States", foundingYear: "1975", employees: "228000", fundingRound: "Established", description: "Internal AI/ML platform option for conversational solutions.", score: "", reasoning: "Built for internal AI/ML teams." },
      { cluster: "Business/Productivity Software", number: 11, vendorName: "Pedestal AI", website: "https://www.pedestal.ai/", origin: "United States", foundingYear: "", employees: "", fundingRound: "", description: "Conversational AI vendor evaluated for customer-facing customs use cases.", score: "", reasoning: "Direct fit to conversational customs experience objective." },
      { cluster: "Business/Productivity Software", number: 12, vendorName: "IBM Watsonx", website: "https://www.ibm.com/products/watsonx-ai", origin: "United States", foundingYear: "", employees: "", fundingRound: "Established", description: "Foundation and enterprise AI platform option.", score: "", reasoning: "Built for internal AI/ML teams." },
      { cluster: "Business/Productivity Software", number: 13, vendorName: "Cohere", website: "https://cohere.com/north", origin: "Canada", foundingYear: "2019", employees: "400", fundingRound: "Later Stage VC", description: "Foundation model provider for enterprise NLP and language workflows.", score: "", reasoning: "Foundation model provider." },
      { cluster: "Business/Productivity Software", number: 14, vendorName: "Sana", website: "https://sanalabs.com/", origin: "Sweden", foundingYear: "2016", employees: "250", fundingRound: "Series C", description: "Knowledge assistant and AI learning platform with search, chat, and automation capabilities.", score: "", reasoning: "Knowledge assistant relevance." },
      { cluster: "Business/Productivity Software", number: 15, vendorName: "Kore.ai", website: "https://kore.ai/", origin: "United States", foundingYear: "2013", employees: "1000", fundingRound: "Series D", description: "Enterprise conversational AI platform for customer and employee interactions.", score: "", reasoning: "Strong customer-facing conversational interface capability." },
      { cluster: "Business/Productivity Software", number: 16, vendorName: "Ada", website: "https://www.ada.cx/", origin: "Canada", foundingYear: "2016", employees: "459", fundingRound: "Series C", description: "Chatbot platform for personalized support experiences at scale.", score: "", reasoning: "Customer support automation relevance." },
      { cluster: "Business/Productivity Software", number: 17, vendorName: "Pando AI", website: "https://pando.ai/", origin: "United States", foundingYear: "2015", employees: "272", fundingRound: "Series B", description: "AI-powered freight automation and supply chain execution platform.", score: "", reasoning: "Logistics-specific relevance." },
    ],
    selectedVendors: [
      { number: 1, vendorName: "Beam.ai", contactEmail: "quentin.silvestro@beam.ai", contactName: "Quentin Silvestro", role: "GTM Lead", comments: "", contactReceived: "Y", formSent: "Y", formReceived: "" },
      { number: 2, vendorName: "Pedestal AI", contactEmail: "raj@pedestal.ai", contactName: "Raj Aggarwal", role: "CEO", comments: "", contactReceived: "Y", formSent: "Y", formReceived: "Y" },
      { number: 3, vendorName: "Sligo AI", contactEmail: "mireia@sligo.ai", contactName: "Mireia Brancos", role: "CRO", comments: "", contactReceived: "Y", formSent: "Y", formReceived: "Y" },
      { number: 4, vendorName: "Kore.ai", contactEmail: "meenakshi.ranjan@kore.com", contactName: "Meenakshi Ranjan", role: "Global Marketing Manager", comments: "", contactReceived: "Y", formSent: "Y", formReceived: "Y" },
    ],
    demoVendors: [
      { number: 1, vendorName: "Pedestal AI", contactEmail: "raj@pedestal.ai", contactName: "Raj Aggarwal", role: "CEO", nda: "Y", demoDate: "31st October", plus: "Insights analysis; accuracy", minus: "Speed", pocCost: "$25,000", deploymentCost: "Based on value generation" },
      { number: 2, vendorName: "Sligo AI", contactEmail: "mireia@sligo.ai", contactName: "Mireia Brancos", role: "CRO", nda: "Y", demoDate: "4th November", plus: "N/A", minus: "Backed out", pocCost: "$30,000", deploymentCost: "N/A" },
      { number: 3, vendorName: "Kore.ai", contactEmail: "lyndsee.manna@kore.com", contactName: "Lyndsee Manna", role: "Strategic Enterprise Account Executive", nda: "Y", demoDate: "4th November", plus: "Plug and play agents", minus: "", pocCost: "", deploymentCost: "Pricing follow-up required" },
      { number: 4, vendorName: "DXC", contactEmail: "matthias.bauhammer@dxc.com", contactName: "Matthias Bauhammer", role: "Head of Data & AI", nda: "Y", demoDate: "6th November", plus: "", minus: "", pocCost: "", deploymentCost: "" },
      { number: 5, vendorName: "Reinvent", contactEmail: "miljenko.bakovic@reeinvent.com", contactName: "Miljenko Bakovic", role: "CEO", nda: "Y", demoDate: "3rd November", plus: "Speed", minus: "", pocCost: "", deploymentCost: "" },
    ],
    vendorEvaluations: [
      { vendorName: "Pedestal AI", strategicFit: "5", logisticsFit: "4", integrationFit: "4", securityReadiness: "4", speedToValue: "5", commercialFit: "4", notes: "Strong fit for customer-facing customs use case with fast path to pilot." },
      { vendorName: "Kore.ai", strategicFit: "4", logisticsFit: "3", integrationFit: "4", securityReadiness: "4", speedToValue: "4", commercialFit: "3", notes: "Mature enterprise platform with strong agent model, but pricing and fit need more diligence." },
      { vendorName: "Beam.ai", strategicFit: "3", logisticsFit: "3", integrationFit: "3", securityReadiness: "3", speedToValue: "4", commercialFit: "3", notes: "Interesting automation path, but less direct fit for the primary customer-facing use case." },
      { vendorName: "Sligo AI", strategicFit: "3", logisticsFit: "3", integrationFit: "3", securityReadiness: "3", speedToValue: "2", commercialFit: "2", notes: "Backed out during demo cycle, reducing execution confidence." },
    ],
    selectedVendor: "Pedestal AI",
    strategicAlignment: "Strong strategic fit for customer-facing customs services and the broader push toward reusable AI-enabled service experiences.",
    timeToMarket: "Fastest route is to leverage an existing conversational AI platform and adapt it to customs workflows rather than building the stack from scratch.",
    capabilitiesFit: "Core conversational capabilities exist in the market, but the final solution still depends on integration approach, enterprise controls, and how customs knowledge is grounded.",
    partnerSummary: "Recommend proceeding with a partner-led route using an established conversational AI platform that can be adapted quickly and scaled across customs use cases.",
    value: "Higher retention, lower support friction, stronger customer experience, and a reusable AI capability for customs services.",
    blockers: "Solution architecture, data readiness, and cross-functional execution ownership are not yet locked.",
    notes: "Derived from the Customs Services discovery sheet for the Customer Facing Conversational AI case.",
    pocBudget: "25000",
    tasks: [
      { id: "cca-t1", title: "Validate churn exposure with NAM account teams", owner: "Nicoloe Stojeski", due: "2026-06-18", done: true },
      { id: "cca-t2", title: "Define V1 Track pilot scope", owner: "Customs Product", due: "2026-06-25", done: false },
      { id: "cca-t3", title: "Align security review for Pedestal AI", owner: "Cyber Risk", due: "2026-07-02", done: false },
    ],
  },
  {
    id: 7,
    name: "MEC NAM PUDO Network Design",
    productArea: "Network Optimization",
    owner: "Network Team",
    dateRequested: "2026-03-30",
    businessFunction: "First Mile / Strategic Network Design",
    stakeholderName: "MEC NAM Core Team",
    regionScope: "USA / NAM (CA, NY, NJ)",
    stage: "POC",
    status: "Green",
    priority: "Strategic",
    targetDate: "2026-06-20",
    nextMilestone: "Complete NY & NJ network design; superimpose brownfield nodes onto greenfield blueprint",
    recommendation: "Iterate PoC",
    problem: "The USPS/TEMU program (launched 27 May 2025) scaled rapidly but growth introduced operational and compliance challenges — unscheduled bulk drop-offs (abandoned gaylords), improper packaging, Hazmat label misuse, and high residential/apartment volumes. This underscores the need for a structured, compliant, scalable first-mile PUDO (pick-up/drop-off) network across the US.",
    impact: "Without a structured first-mile model, USPS compliance flags and inconsistent merchant behavior put the program's scalability and carrier relationships at risk.",
    objectivePrimary: "Build a scalable national drop-off/pickup network, starting with a focused proof of concept across shortlisted Maersk Operational Centers (MOCs) and Satellite hubs at zip-code level to learn, iterate, and scale.",
    objectiveSecondary: "Route shipments through an integrated first-mile US network with middle mile and upstream supply chain, selecting the most efficient delivery/consolidation method by speed, cost, SLA, and customer retention.",
    currentChallenges: "Superimposing ~3,700 postal locations and ~150 (MGF & MCL) locations for potential Satellite & MOC nodes onto the greenfield network blueprint to produce an optimised design. No existing COTS tool has this capability; it requires heavy custom development with multiple tool SDEs.",
    previousSolutions: "Greenfield center-of-gravity analysis completed for MOC and Satellite nodes in the CA marketplace; brownfield multi-scenario analysis completed.",
    dreamScenario: "A synchronized ML-automated model that supports dynamic routing decisions, optimises resource allocation, and meets diverse customer demands and SLAs across an integrated FM + MM network.",
    implementationRisks: "Dependency on AI/ML tool selection; complex superimposition of greenfield + brownfield locations; coverage timeline must align with internal stakeholders and Maersk customers.",
    resourcesRequired: "Network team, Ops, tool SDEs, and internal stakeholder alignment.",
    scalabilityVision: "Start with 15 zip codes in CA (also addressing NY & NJ), then expand phase by phase to a national network aligned with stakeholders and customers.",
    value: "A compliant, scalable first-mile network enabling efficient dynamic routing, lower cost, improved SLA adherence, and stronger customer retention.",
    blockers: "Phase 1 (NY & NJ) dependent on tool selection; Phase 2 (rest of network) not yet started.",
    notes: "Source: [MEC NAM] Strategic Network Design and Optimisation 2026 — Bi-Weekly Status Report (May '26). Overall trending green.",
    pocHypothesis: "A focused zip-code-level PUDO network POC (15 CA zip codes, extended to NY & NJ) will validate the hub-and-spoke design and prove the network can scale nationally with acceptable cost, SLA, and compliance outcomes.",
    pocSuccessCriteria: [
      { id: "mecnd-c1", text: "Greenfield COG design completed for MOC and Satellite nodes (CA market)", met: true },
      { id: "mecnd-c2", text: "Zip-code-level POC completed for full CA marketplace", met: true },
      { id: "mecnd-c3", text: "NY & NJ network design completed and validated", met: false },
      { id: "mecnd-c4", text: "Brownfield nodes superimposed onto greenfield blueprint for optimised design", met: false },
      { id: "mecnd-c5", text: "Ops review sign-off on POC results", met: false },
    ],
    pocStartDate: "2026-04-15",
    pocEndDate: "2026-06-20",
    pocOutcome: "Pending",
    tasks: [
      { id: "mecnd-t1", title: "Finalise North Star Vision & BRD document", owner: "Core Team", due: "2026-05-30", done: false },
      { id: "mecnd-t2", title: "Complete Phase 1 network design (NY & NJ market)", owner: "Network Team + Ops", due: "2026-05-27", done: false },
      { id: "mecnd-t3", title: "Phase 2 network design (rest of network)", owner: "Network Team + Ops", due: "2026-06-05", done: false },
      { id: "mecnd-t4", title: "LM + MM integrated network design solution", owner: "Network Team + Ops", due: "2026-06-15", done: false },
      { id: "mecnd-t5", title: "Integrated North Star network design", owner: "Network Team + Ops", due: "2026-06-15", done: false },
    ],
  },
  {
    id: 8,
    name: "MEC NAM ML Network Optimisation Tool",
    productArea: "Network Optimization",
    owner: "Network Team",
    dateRequested: "2026-04-05",
    businessFunction: "Network Optimisation / Data Science",
    stakeholderName: "MEC NAM Core Team",
    regionScope: "USA / NAM",
    stage: "POC",
    status: "Amber",
    priority: "Strategic",
    targetDate: "2026-06-20",
    nextMilestone: "Test 2 remaining tools, evaluate against success criteria, and make tool selection go/no-go",
    recommendation: "Iterate PoC",
    problem: "Designing and continuously optimising the first-mile + middle-mile network requires an AI/ML tool that can superimpose ~3,700 postal and ~150 MOC/Satellite locations onto a greenfield blueprint and produce an optimised, dynamically routable network design. No existing COTS tool meets this requirement.",
    impact: "Without a fit-for-purpose optimisation engine, the network design cannot be dynamically optimised for speed, cost, and SLA at scale, limiting the program's scalability and sustainability.",
    objectivePrimary: "Select or develop an ML-based network optimisation tool that supports dynamic routing, resource allocation, vendor mix, and continuous network design improvement.",
    objectiveSecondary: "Enable a synchronized model for dynamic routing decisions and SLA-aware consolidation across the integrated network.",
    currentChallenges: "Of three AI/ML-enabled network optimisation tools evaluated, one was tested and dropped (did not meet requirements); the other two are taking longer than anticipated (ETA 29 May). Superimposition logic needs heavy customisation; Network team is working with multiple tool SDEs.",
    previousSolutions: "Network baseline and data scoping, mathematical modeling, and scenario engine development completed. One tool fully tested; a 16-week volume scenario analysis run to gauge network and business KPI impact.",
    dreamScenario: "A synchronized ML-automated model enabling dynamic routing decisions, optimised resource allocation, and SLA-aware consolidation across the integrated network.",
    implementationRisks: "Two of three tools delayed; COTS tools lack the required superimposition capability and need heavy customisation; go/no-go decision dependent on tool outcomes.",
    resourcesRequired: "Network team, data science, tool SDEs, and Core team for UAT and go/no-go.",
    scalabilityVision: "A reusable optimisation engine driving dynamic routing and continuous network design improvement across the national network.",
    value: "Optimised, dynamically routable network design that lowers cost, improves SLA adherence, and supports scalable, sustainable network operations.",
    blockers: "Two tools behind schedule (ETA 29 May); superimposition capability not yet available in evaluated tools.",
    notes: "Source: [MEC NAM] Strategic Network Design and Optimisation 2026 — Bi-Weekly Status Report (May '26). Testing 3 tools; 1 tested, 1 dropped, 2 in mature stages.",
    pocHypothesis: "An AI/ML network optimisation tool can ingest greenfield + brownfield location data, superimpose ~3,700 postal and ~150 MOC/Satellite nodes, and output an optimised network design supporting dynamic routing by speed, cost, and SLA — outperforming manual/COTS approaches.",
    pocSuccessCriteria: [
      { id: "mectool-c1", text: "Scenario engine developed and validated against baseline data", met: true },
      { id: "mectool-c2", text: "16-week volume scenario analysis run for scalability assessment", met: true },
      { id: "mectool-c3", text: "Tool can superimpose 3,700 postal + 150 MOC/Satellite locations onto greenfield blueprint", met: false },
      { id: "mectool-c4", text: "2 remaining tools tested and evaluated against success criteria", met: false },
      { id: "mectool-c5", text: "Tool selection go/no-go decision made", met: false },
    ],
    pocStartDate: "2026-04-05",
    pocEndDate: "2026-05-29",
    pocOutcome: "Pending",
    tasks: [
      { id: "mectool-t1", title: "UI/UX customisation and integration", owner: "Network Team", due: "2026-05-10", done: false },
      { id: "mectool-t2", title: "Pilot testing and iterative refinement", owner: "Core Team", due: "2026-05-20", done: false },
      { id: "mectool-t3", title: "UAT of candidate tools", owner: "Core Team", due: "2026-05-20", done: false },
      { id: "mectool-t4", title: "Tool selection: go/no-go decision", owner: "Core Team", due: "2026-05-25", done: false },
      { id: "mectool-t5", title: "Dynamic routing & resource allocation optimisation (monthly)", owner: "Core Team", due: "2026-06-20", done: false },
      { id: "mectool-t6", title: "Vendor allocation mix and procurement", owner: "Core Team", due: "2026-06-20", done: false },
    ],
  },
  {
    id: 9,
    name: "RetailReady Compliance Label POC",
    productArea: "Other",
    owner: "Doudou BA",
    dateRequested: "2026-06-12",
    businessFunction: "Retail Compliance / WMS Engineering",
    stakeholderName: "Russ Shadoff, Jacob Pazitka, Yujie Su, Scott Fairley",
    regionScope: "USA / NAM (Maersk Contract Logistics)",
    stage: "POC",
    status: "Amber",
    priority: "Strategic",
    targetDate: "2026-06-30",
    nextMilestone: "Hold value-prop alignment call (Jacob, Su, Doudou + Elle), then lock POC start date once Russ is back",
    recommendation: "Select for PoC",
    problem: "Maersk Contract Logistics must implement and maintain retailer compliance for clients faster and more efficiently. Building and maintaining retailer-specific compliance label templates is slow and high-touch, and the broader compliance / chargeback-dispute workflow is largely manual across site operations.",
    impact: "Slow, manual compliance handling lengthens client onboarding, raises TCO for implementing and maintaining compliance clients, and exposes the business to retailer chargebacks. A narrow label-only view understates the value; stakeholders across site ops and leadership need a compelling case to engage.",
    financialImpact: "Upside spans faster time-to-market for new compliance clients, lower implementation/maintenance TCO, site-ops productivity and training gains, and chargeback savings. Quantified estimates to be developed per stakeholder group.",
    objectivePrimary: "Run a POC of RetailReady's compliance label generation API: a single API call per container returns a retailer-compliant ZPL label with no custom template maintenance on Maersk's side.",
    objectiveSecondary: "Build a clear value proposition beyond label printing — positioning RetailReady as a compliance engine and chargeback-dispute partner across TCO/implementation, site ops users, site ops leadership, and MCL leadership.",
    currentChallenges: "Speed-to-market on labels is only part of the value and has proven less enticing than expected. The non-printing feature set (compliance partnership, chargeback dispute support, portal/guides for site ops) needs to be detailed to engage the full stakeholder set. Retailer/merchant test pairs not yet identified.",
    previousSolutions: "Compliance label templates currently built and maintained manually per retailer. The Amazon FBM integration pattern already exists internally and can be reused, keeping Maersk-side dev lift minimal.",
    dreamScenario: "RetailReady serves as Maersk's compliance engine: transparent, compliant labels generated on demand via API, plus portal/guides that make daily site operations faster and easier, measurable productivity and training improvements, and chargeback savings — building a sustainable partnership beyond a label POC.",
    implementationRisks: "Need a strong, differentiated value proposition for each stakeholder group to gain and keep engagement; dependency on internal sign-offs and contractual alignment before kickoff; scheduling constraints (Elle traveling, Russ on vacation); retailer/merchant test-pair selection still open.",
    resourcesRequired: "WMS engineering (reuse of Amazon FBM integration pattern), site ops input, internal sign-offs, and contractual alignment. Vendor: RetailReady AI (Elle Smyth, Co-Founder/CEO).",
    scalabilityVision: "Start with a focused label-generation POC on selected retailer/merchant pairs, then scale RetailReady into a broader compliance and chargeback-dispute engine across MCL NAM and beyond.",
    selectedVendor: "RetailReady AI",
    value: "Faster, more efficient retail compliance implementation; transparent compliant labels for site ops; productivity, training, and chargeback-savings gains; and a reusable compliance engine for Maersk.",
    blockers: "Pending internal sign-offs and contractual alignment; POC start date not locked (waiting on Russ's return); retailer/merchant test pairs not yet identified.",
    notes: "Vendor: RetailReady AI (retailreadyai.com, Y Combinator) — Elle Smyth, Co-Founder/CEO. MNDA signed 15 Jun 2026. POC doc + pricing prepared with Russ Shadoff. Stakeholder groups to win over: TCO/Implementation, site ops users, site ops leadership, MCL leadership. Russ's proposed 30-min slots (EST) for the alignment call: Tue 23 Jun 1:30/3:00/4:30; Wed 24 Jun 9:30/2:30/3:30/4:00/4:30; Thu 25 Jun 2:00-4:30; Fri 26 Jun 9:30/10:00/10:30/2:30/4:00. Source: Maersk / RR POC kickoff email thread (Jun 2026).",
    pocHypothesis: "A single RetailReady API call per container can return a retailer-compliant ZPL label with no custom template maintenance, reusing the existing Amazon FBM integration pattern for minimal Maersk dev lift — while a detailed non-printing value proposition (compliance partnership, chargeback dispute, site-ops portal/guides) makes the case for a broader, sustainable partnership.",
    pocSuccessCriteria: [
      { id: "rr-c1", text: "MNDA signed", met: true },
      { id: "rr-c2", text: "POC scope confirmed: compliance label generation API layer", met: true },
      { id: "rr-c3", text: "Single API call per container returns a retailer-compliant ZPL label", met: false },
      { id: "rr-c4", text: "Retailer/merchant test pairs identified and coverage confirmed", met: false },
      { id: "rr-c5", text: "Value proposition detailed for each stakeholder group (TCO, site ops users, site ops leadership, MCL leadership)", met: false },
      { id: "rr-c6", text: "Internal sign-offs and contractual alignment complete; start date locked", met: false },
    ],
    pocStartDate: "2026-06-12",
    pocEndDate: "2026-07-31",
    pocOutcome: "Pending",
    tasks: [
      { id: "rr-t1", title: "Schedule 30-min value-prop alignment call (Jacob, Su, Doudou + Elle) using Russ's proposed slots", owner: "Doudou BA", due: "2026-06-26", done: false },
      { id: "rr-t2", title: "Detail non-printing value props (compliance partner, chargeback dispute) per stakeholder group", owner: "Russ Shadoff", due: "2026-06-30", done: false },
      { id: "rr-t3", title: "Identify retailer/merchant test pairs and confirm RetailReady coverage", owner: "Doudou BA", due: "2026-06-30", done: false },
      { id: "rr-t4", title: "Complete internal sign-offs and contractual alignment", owner: "Russ Shadoff", due: "2026-07-10", done: false },
      { id: "rr-t5", title: "Lock POC start date once Russ is back from vacation", owner: "Russ Shadoff", due: "2026-07-10", done: false },
    ],
  },
  {
    id: 10,
    name: "Ranger AI Automated RFX",
    productArea: "Other",
    owner: "Doudou BA",
    dateRequested: "2026-03-24",
    businessFunction: "Tender Management / Contract Logistics RFX (NAM)",
    stakeholderName: "Valerie Mango (Head of Tender Management, NAM), Joseph Petruzzelli, Patrick Blinn, Yujie Su",
    regionScope: "USA / NAM (US East Coast tender management team)",
    stage: "Scouting",
    status: "Amber",
    priority: "Strategic",
    targetDate: "2026-06-30",
    nextMilestone: "Sign the mutual NDA, finish internal alignment and external solution assessment, then confirm the POC kickoff date",
    recommendation: "Continue Scouting",
    problem: "Maersk Contract Logistics' tender management team responds to complex warehousing/3PL RFX end to end (inbound → processing → outbound) on a ~20-day cycle. Customer ROI lands late at day 7-10, after engineering has mostly locked the design, and most knowledge sits in people's heads rather than in a system — limiting speed, consistency, and capacity to pursue more tenders.",
    impact: "Calculating ROI from day one lets the team pick technology that pencils out for the customer, run more concurrent pursuits with the same team, and deliver a consistent Maersk experience across tiers and regions — all against a ~6.7x growth target.",
    financialImpact: "Value comes from lower cost to produce a tender response, more concurrent pursuits per team (do more with the same), and improved win quality. Benchmark numbers from Ranger's current/past customers to be used to map expected impact.",
    objectivePrimary: "Run a POC that proves measured impact against the documented as-is process (not a demo): move ROI to day 1, increase concurrent pursuits, lower cost per response, and improve quality.",
    objectiveSecondary: "Move RFX knowledge out of people's heads into a system — especially for lower-tier tenders where standardization is realistic — and integrate with SharePoint and Maersk's existing tools.",
    currentChallenges: "ROI lands day 7-10 inside a ~20-day cycle; knowledge is tacit and uncodified; tender responses are produced manually. Maersk is aligning internally and assessing other external solutions to confirm best fit for MCL before committing to a kickoff.",
    previousSolutions: "No automated RFX tooling in place today; proposals handled manually end to end by tender management.",
    dreamScenario: "Ranger ingests Maersk's past RFX plus knowledge base; on receipt of a new RFX it generates the response (whole or in parts) with skills automating the cross-functional process through review and submission, delivering ROI from day one and a consistent experience across regions.",
    implementationRisks: "Mutual NDA not yet signed; competing external solutions still under assessment; data/IP considerations around ingesting past RFX; SharePoint/tooling integration; cross-time-zone scheduling; reliance on baseline accuracy to prove the target deltas.",
    resourcesRequired: "Tender management (Valerie Mango), Joseph Petruzzelli (ROI/pricing model + Excel), Patrick Blinn, Yujie Su, and Ranger (Kyle Jordan, James Zhan). POC workbook with mutual action plan, requirements list, and capability matrix.",
    scalabilityVision: "Start with lower-tier, standardizable tenders, then scale across pursuit tiers and regions for a consistent Maersk RFX experience aligned with the ~6.7x growth target.",
    selectedVendor: "Ranger (rangerrfx.com)",
    value: "ROI from day 1 (vs day 7-10), more concurrent pursuits with the same team, lower cost per tender response, higher quality, and codified RFX knowledge across regions.",
    blockers: "Mutual NDA not yet signed; internal alignment in progress and alternative external solutions still being assessed before a kickoff date is confirmed.",
    notes: "Vendor: Ranger — James Zhan, CEO (james@rangerrfx.com); Kyle Jordan, Founding Partner (kyle.jordan@rangerrfx.com, +1 415-987-6995). Proposed POC timeline: problem discovery closed Fri 12 Jun, Head of Product sign-off Mon 15 Jun, kickoff targeted 23 Jun — now ON HOLD pending internal alignment and assessment of other external solutions; Doudou to revert on kickoff after assessment. NDA to be signed in the meantime. POC must prove measured impact, not run a demo. Pre-kickoff working sessions requested: Joseph (ROI process + Excel/pricing model, where it sits in the RFP cycle) and Valerie (scoping the full RFP response requirements / tender management ownership). Ranger to share benchmark numbers from current/past customers ahead of 12 Jun. POC workbook live (mutual action plan, requirements list, capability matrix, pilot summary, use cases, personas, success criteria, artifacts required). Integration with SharePoint + Maersk tools in scope. ~6.7x growth target is the backdrop. Source: Ranger AI Deep Dive email thread (Mar–Jun 2026).",
    pocHypothesis: "Ranger AI can deliver customer ROI on day 1 (vs day 7-10 in a ~20-day cycle), let the same team run more concurrent pursuits, lower the cost to produce a tender response, and improve quality — proving measured impact against a documented as-is baseline while codifying RFX knowledge into a system.",
    pocSuccessCriteria: [
      { id: "ranger-c1", text: "As-is baseline documented (time, effort, cost, quality) before Ranger touches anything", met: false },
      { id: "ranger-c2", text: "Time: ROI delivered day 1 vs as-is day 7-10; shorter overall tender turnaround (~20-day cycle)", met: false },
      { id: "ranger-c3", text: "Effort: fewer people-hours per pursuit and more concurrent pursuits per team (do more with the same)", met: false },
      { id: "ranger-c4", text: "Cost: lower cost to produce a tender response", met: false },
      { id: "ranger-c5", text: "Quality: fewer manual data entries, less rework, lower error rate", met: false },
    ],
    pocOutcome: "Pending",
    tasks: [
      { id: "ranger-t1", title: "Sign the mutual NDA (Maersk ↔ Ranger)", owner: "Doudou BA", due: "2026-06-30", done: false },
      { id: "ranger-t2", title: "Complete internal alignment and assess alternative external solutions for MCL", owner: "Doudou BA", due: "2026-06-30", done: false },
      { id: "ranger-t3", title: "Working session with Joseph: ROI process + Excel/pricing model and RFP-cycle fit", owner: "Joseph Petruzzelli", due: "2026-06-12", done: false },
      { id: "ranger-t4", title: "Scoping session with Valerie: confirm full RFP response process requirements", owner: "Valerie Mango", due: "2026-06-12", done: false },
      { id: "ranger-t5", title: "Ranger to share benchmark numbers from current/past customers", owner: "Kyle Jordan", due: "2026-06-12", done: false },
      { id: "ranger-t6", title: "Document as-is baseline and set target deltas (time/effort/cost/quality)", owner: "Doudou BA", due: "2026-06-12", done: false },
      { id: "ranger-t7", title: "Confirm POC kickoff date after internal + external assessment", owner: "Doudou BA", due: "2026-06-30", done: false },
    ],
  },
  {
    id: 11,
    name: "Logistics Terminal POC",
    productArea: "Other",
    owner: "Doudou BA",
    dateRequested: "2026-06-09",
    businessFunction: "Contract Logistics / Solution Design (scoping & pricing)",
    stakeholderName: "Joseph Petruzzelli, Yujie Su",
    regionScope: "USA / NAM (Charlotte, NC vendor; Maersk NAM + Stockholm)",
    stage: "Scouting",
    status: "Green",
    priority: "High",
    targetDate: "2026-06-30",
    nextMilestone: "Run product demo, share Maersk MNDA template, and clarify fee/conversion/post-POC commercials before kickoff",
    recommendation: "Select for PoC",
    problem: "Scoping and pricing logistics/warehousing solutions is manual and inconsistent, making it hard to produce accurate, timely proposals. Joseph and the team described scoping and pricing challenges that align with Logistics Terminal's focus.",
    impact: "A platform that compares favorably against Maersk's existing data sources and processes could improve the accuracy and speed of scoping and pricing, strengthening proposal quality and turnaround.",
    financialImpact: "Commercials still open — fee, conversion, and post-POC pricing need clarification before proceeding.",
    objectivePrimary: "Run a 45-day POC sprint to evaluate the Logistics Terminal platform within Maersk's operating environment, comparing its outputs against existing data sources at defined milestones.",
    objectiveSecondary: "Assess product fit, architecture, and value for scoping and pricing, and provide structured feedback to the vendor.",
    currentChallenges: "MNDA not yet in place (Maersk template to be shared); fee, conversion, and post-POC commercials need clarification; internal review with Joe and stakeholders pending; product demo not yet held.",
    previousSolutions: "Scoping and pricing handled manually today; no comparable platform in use.",
    dreamScenario: "Logistics Terminal's outputs validated against Maersk data over a 45-day sprint, demonstrating clear accuracy and efficiency gains that justify conversion to an ongoing solution.",
    implementationRisks: "Open commercial terms (fee, conversion, post-POC); MNDA signature pending; need clean comparison data; alignment across NAM and Stockholm time zones; vendor is early-stage (founder-led).",
    resourcesRequired: "Joseph Petruzzelli, Doudou BA, relevant stakeholders, Maersk MNDA template, and existing data sources for comparison. Vendor: Logistics Terminal (Jordan Lawrence, Jeff Graham).",
    scalabilityVision: "If the 45-day POC proves out, scope conversion to a broader scoping-and-pricing solution across MCL pursuits.",
    selectedVendor: "Logistics Terminal, Inc.",
    value: "Faster, more accurate scoping and pricing; structured comparison against current data; and a clear basis to decide on conversion.",
    blockers: "MNDA not signed; fee, conversion, and post-POC commercials unresolved; internal review pending.",
    notes: "Vendor: Logistics Terminal, Inc. (Charlotte, NC — www.LogisticsTerminal.com). Contacts: Jordan Lawrence, Founder (jordan@logisticsterminal.com, +1 919-272-1810); Jeff Graham (jeff.graham@logisticsterminal.com). Joseph Petruzzelli initiated the POC; Doudou supporting and working closely with the vendor throughout. Logistics Terminal shared a 45-day POC sprint framework with milestones comparing Maersk's existing data sources against its outputs. MNDA: Maersk to share its template for vendor review/sign. Open items: fee, conversion, and post-POC commercials. Product demo being scheduled (Jordan available 8:30-11 AM EST, ~Doudou's afternoon in Stockholm; Doudou off rest of that week). Source: Logistics Terminal POC kickoff email thread (Jun 2026).",
    pocHypothesis: "A 45-day POC sprint comparing Logistics Terminal's outputs against Maersk's existing data sources and processes will demonstrate measurable accuracy and efficiency gains in scoping and pricing, justifying conversion.",
    pocSuccessCriteria: [
      { id: "lt-c1", text: "MNDA signed on Maersk template", met: false },
      { id: "lt-c2", text: "45-day POC framework and milestones reviewed and agreed internally", met: false },
      { id: "lt-c3", text: "Fee, conversion, and post-POC commercials clarified", met: false },
      { id: "lt-c4", text: "Platform outputs compared against Maersk existing data sources at sprint milestones", met: false },
      { id: "lt-c5", text: "Product demo completed and feedback captured", met: false },
    ],
    pocOutcome: "Pending",
    tasks: [
      { id: "lt-t1", title: "Schedule product demo with Jordan (8:30-11 AM EST) and capture feedback", owner: "Doudou BA", due: "2026-06-16", done: false },
      { id: "lt-t2", title: "Review 45-day POC framework internally with Joe and stakeholders", owner: "Doudou BA", due: "2026-06-20", done: false },
      { id: "lt-t3", title: "Share Maersk MNDA template for Logistics Terminal to review/sign", owner: "Doudou BA", due: "2026-06-18", done: false },
      { id: "lt-t4", title: "Clarify fee, conversion, and post-POC commercials", owner: "Doudou BA", due: "2026-06-20", done: false },
      { id: "lt-t5", title: "Confirm 45-day POC scope and kickoff date", owner: "Joseph Petruzzelli", due: "2026-06-30", done: false },
    ],
  },
  {
    id: 12,
    name: "Innovation Brain PoC",
    productArea: "Other",
    owner: "Doudou BA",
    dateRequested: "2026-06-23",
    businessFunction: "Innovation / Internal AI Tooling",
    stakeholderName: "Lars Krieger Andersen (Senior Engineering Manager), Yujie Su",
    regionScope: "Global (Maersk Innovation team)",
    stage: "POC",
    status: "Green",
    priority: "Strategic",
    targetDate: "2026-07-15",
    nextMilestone: "Enable AI model/API access via Maersk MIDAS AI LLM Gateway and confirm Claude Code credits can be used",
    recommendation: "Iterate PoC",
    problem: "The Innovation team's project information, decisions, and knowledge are scattered, making it hard to summarize status, retrieve prior knowledge, and collaborate. There is no centralized 'team brain' for portfolio and project management.",
    impact: "A centralized, AI-powered tracker would let the team summarize project information on demand, retrieve institutional knowledge, and collaborate more effectively — reducing manual reporting and knowledge loss.",
    objectivePrimary: "Build 'odyssey', an AI-powered Project Management Tracker that serves as a centralized knowledge base and team brain — summarizing project info, retrieving knowledge, and supporting collaboration. (This is the platform currently used to run the innovation portfolio.)",
    objectiveSecondary: "Integrate the required AI capabilities via Maersk's standard operating model for model access (MIDAS AI LLM Gateway), using available Claude Code credits where possible.",
    currentChallenges: "Need API access to AI models enabled for the team. Maersk's standard path is the MIDAS AI LLM Gateway; need to confirm whether existing Claude Code credits can be used or models enabled through the gateway, plus budget and approvals.",
    previousSolutions: "Manual, document-based project tracking and reporting; no AI-assisted knowledge base in place.",
    dreamScenario: "A living team brain where the Innovation team logs initiatives, decisions, and POCs, and AI summarizes status, surfaces relevant prior knowledge, and drafts updates — keeping the whole portfolio current with minimal manual effort.",
    implementationRisks: "Dependency on enabling model/API access through MIDAS AI LLM Gateway; budget/approval gates; data governance for centralized knowledge; ensuring AI integration meets Maersk security standards.",
    resourcesRequired: "Lars Krieger Andersen to help unblock model/API access, budget, and approvals; Doudou leading build and process; Claude Code credits already available.",
    scalabilityVision: "Prove the innovation brain for the Innovation team, then extend the centralized knowledge base and AI assistance to adjacent teams.",
    selectedVendor: "Internal build (Claude API via Maersk MIDAS AI LLM Gateway)",
    value: "Centralized knowledge, on-demand project summaries, faster knowledge retrieval, and better collaboration — less time on manual reporting.",
    blockers: "AI model/API access not yet enabled; confirmation needed on Claude Code credit usage; budget and approvals pending.",
    notes: "Internal platform being built by Doudou — 'odyssey', an AI-powered Project Management Tracker / centralized knowledge base and team brain (the tool currently used to run this innovation portfolio). Lars Krieger Andersen (Senior Engineering Manager, A.P. Moller - Maersk, Copenhagen) is sponsoring/enabling and offered to help unblock budget, approvals, and ideas; he scoped this as a PoC of building an 'innovation brain' and asked what is required from his side. Maersk standard operating model for model access: MIDAS AI LLM Gateway (https://docs.maersk.io/midas-ai/llm-gateway). Doudou has Claude Code credits and is checking whether they can be enabled/used. Source: Claude API / Innovation Brain email thread (Jun 2026).",
    pocHypothesis: "An AI-powered project management tracker ('Innovation Brain'/odyssey) integrating Claude via Maersk's MIDAS AI LLM Gateway can centralize knowledge, auto-summarize project information, retrieve prior knowledge, and improve collaboration for the Innovation team.",
    pocSuccessCriteria: [
      { id: "ib-c1", text: "Platform built and in active use by the Innovation team to run the portfolio", met: true },
      { id: "ib-c2", text: "Requirements reviewed with Lars and scope of the 'innovation brain' PoC agreed", met: false },
      { id: "ib-c3", text: "AI model/API access enabled via Maersk MIDAS AI LLM Gateway", met: false },
      { id: "ib-c4", text: "Claude Code credits confirmed usable for the integration", met: false },
      { id: "ib-c5", text: "AI summarization and knowledge-retrieval features integrated into the tracker", met: false },
    ],
    pocOutcome: "Pending",
    tasks: [
      { id: "ib-t1", title: "Review requirements doc with Lars; confirm what's needed from his side", owner: "Lars Krieger Andersen", due: "2026-06-30", done: false },
      { id: "ib-t2", title: "Enable AI model/API access via Maersk MIDAS AI LLM Gateway", owner: "Lars Krieger Andersen", due: "2026-06-30", done: false },
      { id: "ib-t3", title: "Confirm whether existing Claude Code credits can be used", owner: "Doudou BA", due: "2026-06-26", done: false },
      { id: "ib-t4", title: "Integrate AI summarization & knowledge-retrieval into the tracker", owner: "Doudou BA", due: "2026-07-15", done: false },
      { id: "ib-t5", title: "Secure budget and approvals to unblock the PoC", owner: "Lars Krieger Andersen", due: "2026-07-01", done: false },
    ],
  },
  {
    id: 13,
    name: "AI Captains PoC",
    productArea: "AI Literacy",
    owner: "Doudou BA",
    dateRequested: "2026-05-13",
    businessFunction: "Innovation / AI Literacy & Enablement",
    stakeholderName: "Jacqueline le Mi Nguyen (APMT Technology Portfolio Office), Craig Simpson, Mark Zeitlin, Jeffrey Guss, Cheryl Basil Sequeira, Matteo Magagnoli, Adam McCarter, Yujie Su",
    regionScope: "Global (Maersk, LNS, APM Terminals)",
    stage: "POC",
    status: "Amber",
    priority: "Strategic",
    targetDate: "2026-06-30",
    nextMilestone: "Ship v2: balanced answer patterns, business-focused questions (strategy, impact, ROIC, adoption, risk), and multi-domain SSO",
    recommendation: "Iterate PoC",
    problem: "Maersk needs to baseline where teams — starting with 'AI Captains' — stand on AI fundamentals so Innovation can shape the right enablement programs. There is no structured measure of AI literacy across the org today.",
    impact: "A reliable AI literacy baseline lets Innovation target enablement appropriately (technical vs senior/business leaders) and track uplift over time.",
    objectivePrimary: "Pilot an AI literacy assessment for AI Captains to baseline AI fundamentals and shape enablement programs, with instant feedback on why answers are right or wrong.",
    objectiveSecondary: "Iterate the assessment on pilot feedback — balanced answer difficulty, more business-focused and practical questions, and SSO across Maersk domains.",
    currentChallenges: "Pilot feedback: the first 17 questions were almost all option B and the correct answer was always the longest — answer patterns and difficulty need rebalancing. Content reads as too technical for senior/business leaders. Sign-in is limited to @maersk.com SSO, excluding @lns.maersk.com and @apmterminals.com.",
    previousSolutions: "First pilot of a structured AI literacy assessment; no prior tool.",
    dreamScenario: "A balanced, audience-appropriate AI literacy assessment accessible across Maersk domains, giving a clear baseline and tailored enablement paths for both technical and business leaders.",
    implementationRisks: "Question-design bias (answer-pattern / length tells); audience targeting (technical vs business); SSO/identity across multiple Maersk domains; sustained engagement.",
    resourcesRequired: "Pilot reviewers' feedback, SSO integration for additional domains, and content updates. Built in-house by Maersk Innovation (Doudou).",
    scalabilityVision: "After v2, open the assessment more widely beyond the pilot group across Maersk, LNS, and APM Terminals.",
    selectedVendor: "Internal build (Maersk Innovation)",
    value: "Structured AI literacy baseline, targeted enablement, instant learning feedback, and a strong assessment UX (well-liked visual layout and 'why' explanations).",
    blockers: "v2 question rebalancing and business-focused content pending; multi-domain SSO (@lns.maersk.com, @apmterminals.com) not yet integrated.",
    notes: "Internal AI literacy assessment built by Doudou (Maersk Innovation), piloted to the AI Captains review group on 13 May 2026 (~20-30 min, Maersk SSO). Reviewers: Jacqueline le Mi Nguyen (Tech Lead Portfolio Partner, APMT Technology Portfolio Office), Craig Simpson, Mark Zeitlin (LNS), Jeffrey Guss (LNS), Cheryl Basil Sequeira, Matteo Magagnoli, Adam McCarter; cc Yujie Su. Feedback (19 May): first 17 questions almost all option B with the longest answer always correct — rebalance difficulty/options; too technical for senior/business leaders — add strategy, business impact, ROIC, adoption, and risk-management questions, more practical than theoretical; praised the visual layout and instant 'why' prompts. SSO currently @maersk.com only — to add @lns.maersk.com and @apmterminals.com. Related to the broader 'AI Literacy Mapping for Leadership' initiative. Source: AI Literacy Mapping pilot email thread (May 2026).",
    pocHypothesis: "A well-designed AI literacy assessment can baseline AI fundamentals for AI Captains and, once rebalanced and tailored by audience with multi-domain SSO, provide a reliable basis to shape and target enablement programs across Maersk.",
    pocSuccessCriteria: [
      { id: "aic-c1", text: "Pilot launched to the AI Captains review group (Maersk SSO sign-in)", met: true },
      { id: "aic-c2", text: "Pilot feedback collected on questions and experience", met: true },
      { id: "aic-c3", text: "Answer patterns balanced and difficulty calibrated (fix option-B / longest-answer bias)", met: false },
      { id: "aic-c4", text: "Business-focused questions added (strategy, impact, ROIC, adoption, risk) for senior/business leaders", met: false },
      { id: "aic-c5", text: "SSO integrated for additional domains (@lns.maersk.com, @apmterminals.com)", met: false },
      { id: "aic-c6", text: "Assessment opened more widely beyond the pilot group", met: false },
    ],
    pocStartDate: "2026-05-13",
    pocOutcome: "Pending",
    tasks: [
      { id: "aic-t1", title: "Rebalance answer patterns and calibrate difficulty (remove option-B / longest-answer bias)", owner: "Doudou BA", due: "2026-06-30", done: false },
      { id: "aic-t2", title: "Add business-focused, practical questions (strategy, impact, ROIC, adoption, risk)", owner: "Doudou BA", due: "2026-06-30", done: false },
      { id: "aic-t3", title: "Integrate SSO for @lns.maersk.com and @apmterminals.com", owner: "Doudou BA", due: "2026-07-07", done: false },
      { id: "aic-t4", title: "Define target audience (technical vs senior/business leaders) and tailor question sets", owner: "Doudou BA", due: "2026-06-30", done: false },
      { id: "aic-t5", title: "Open the assessment more widely after v2", owner: "Doudou BA", due: "2026-07-15", done: false },
    ],
  },
  {
    id: 14,
    name: "AI POA Vetting",
    productArea: "Customs",
    owner: "Doudou BA",
    dateRequested: "2026-06-24",
    businessFunction: "Customs Brokerage / Compliance (POA vetting)",
    stakeholderName: "Mark Zeitlin (LNS), Melissa Fox (LNS), Yujie Su",
    regionScope: "USA (U.S. Customs brokerage / CBP)",
    stage: "Problem Articulation",
    status: "Green",
    priority: "High",
    targetDate: "2026-06-26",
    nextMilestone: "Friday Q&A with Mark Zeitlin to align the vision, scope, and ownership",
    recommendation: "Prioritize for Scouting",
    problem: "U.S. Customs Power of Attorney (POA) vetting is manual and document-heavy. Brokers must verify the grantor's identity and authority, check business registration, validate importer information, confirm address legitimacy, and screen restricted-party lists — and ensure the POA was executed directly with the importer of record or drawback claimant, not via a freight forwarder or unauthorized third party.",
    impact: "Manual POA review is slow, inconsistent, and exposes the broker to compliance risk (reasonable care and national security responsibility), unauthorized representation, and onboarding delays.",
    financialImpact: "Upside: faster customer onboarding, reduced manual document review, fewer compliance failures, and stronger audit readiness. Quantification to be developed.",
    objectivePrimary: "Build an AI-driven POA Vetting Assistant — a broker compliance control tower that ingests the POA package, verifies legal entity and signer, checks against CBP expectations, scores risk, routes exceptions, and preserves an audit trail. It pre-clears, risk-scores, documents, and escalates — it does not approve POAs autonomously (human-in-the-loop).",
    objectiveSecondary: "Answer one core question — can we reasonably demonstrate that this POA was validly executed directly with the importer of record/drawback claimant by an authorized person, and that the importer identity is legitimate? Deliver as a standalone time-saver with a potential path to integrate with Tradelab.",
    currentChallenges: "Verifying direct execution (importer domain, signer involvement, detecting forwarder-only submissions, auditable e-signature); confirming signer authority against officer/registration records; entity legitimacy and address validation; sanctions/restricted-party screening; and audit defensibility — all done manually today.",
    previousSolutions: "Manual, document-collection-based POA review by broker operations; no AI-assisted vetting in place.",
    dreamScenario: "A POA Vetting Assistant embedded into onboarding and broker compliance workflows producing a simple, evidence-backed output — Accept / Conditional Accept / Escalate / Reject — turning POA management from a document-collection exercise into a controlled compliance process, optionally connected to Tradelab.",
    implementationRisks: "Must not auto-approve without human oversight; access to data sources (ACE importer records, Secretary of State registrations, EIN/W-9, sanctions/restricted-party lists, DUNS/credit); extraction accuracy; regulatory defensibility; and the standalone-vs-Tradelab integration decision.",
    resourcesRequired: "Doudou (lead), Mark Zeitlin and Melissa Fox (LNS — customs/CBP domain), Yujie Su; access to document intake (CBP Form 5291) and validation data sources; and a decision on the Tradelab integration path.",
    scalabilityVision: "From a standalone team time-saver to an embedded compliance control tower across customs brokerage onboarding, with tiered operations (AI auto-validation → broker ops → compliance → legal escalation) and possible Tradelab integration.",
    value: "Compliance risk reduction, faster onboarding, standardized POA validation, better audit readiness, less manual review, and stronger protection against unauthorized broker representation.",
    blockers: "Scope and ownership to confirm with Mark (Friday Q&A); data-source access; standalone-vs-Tradelab integration decision still open.",
    notes: "Vision shared by Mark Zeitlin (mark.zeitlin@lns.maersk.com) on 24 Jun 2026 via Yujie Su; cc Melissa Fox (LNS). Mark suggested Doudou take this on — useful standalone and ideally connected to Tradelab — and offered a conversation; a Q&A chat with Mark is to be booked for Friday. Workflow: (1) document intake (CBP Form 5291/equivalent, EIN/W-9, articles of incorporation, signer ID, email/communication trail, ACE importer record, address/phone/website/DUNS); (2) completeness checks (legal name, DBA, importer#/EIN, physical address, signer name/title, broker name, dates, signature, scope); (3) direct-execution check (importer business email domain, signer involvement, forwarder-only detection, auditable e-signature, evidence of direct broker-importer communication); (4) signer authority verification (Secretary of State, officer records, website, LinkedIn, corporate resolution, email domain match); (5) KYC/POA risk score weighted across legal-entity match 20%, signer authority 20%, direct-execution evidence 20%, address/phone/website 15%, sanctions/restricted-party 15%, document quality 10%, mapped to Low/Moderate/High/Critical actions; (6) red-flag escalation; (7) human-in-the-loop broker-ready recommendation; (8) audit trail retention. CBP framing per the email (cbp.gov, ecfr.gov). Source: 'AI POA Vetting' email thread (Jun 2026).",
    pocHypothesis: "An AI POA Vetting Assistant can extract and validate POA fields, verify direct execution and signer authority, screen restricted parties, and produce an evidence-backed risk score and Accept/Conditional/Escalate/Reject recommendation — cutting manual review time while strengthening CBP reasonable-care compliance, with humans as the final approver.",
    pocSuccessCriteria: [
      { id: "poa-c1", text: "POA fields extracted and validated (legal name, EIN/importer#, address, signer, broker, dates, signature, scope)", met: false },
      { id: "poa-c2", text: "Direct-execution check (importer domain, signer involvement, forwarder-only detection, auditable e-signature)", met: false },
      { id: "poa-c3", text: "Signer authority verified against officer/registration/website sources", met: false },
      { id: "poa-c4", text: "KYC/POA risk score generated with tiered actions (Low/Moderate/High/Critical)", met: false },
      { id: "poa-c5", text: "Sanctions / restricted-party screening integrated", met: false },
      { id: "poa-c6", text: "Human-in-the-loop output (Accept/Conditional/Escalate/Reject) with evidence and full audit trail", met: false },
    ],
    pocOutcome: "Pending",
    tasks: [
      { id: "poa-t1", title: "Book Friday Q&A with Mark Zeitlin to align vision, scope, and ownership", owner: "Doudou BA", due: "2026-06-26", done: false },
      { id: "poa-t2", title: "Document as-is POA vetting process and CBP requirements baseline", owner: "Doudou BA", due: "2026-07-03", done: false },
      { id: "poa-t3", title: "Identify required data sources (ACE, state registration, EIN/W-9, sanctions/restricted-party, DUNS) and access path", owner: "Doudou BA", due: "2026-07-10", done: false },
      { id: "poa-t4", title: "Decide standalone vs Tradelab integration approach", owner: "Mark Zeitlin", due: "2026-07-10", done: false },
      { id: "poa-t5", title: "Define risk-scoring model and human-in-the-loop tiers (Accept/Conditional/Escalate/Reject)", owner: "Doudou BA", due: "2026-07-17", done: false },
    ],
  },
];

const sampleDecisions = [
  {
    id: 1,
    project: "AI Literacy Mapping for Leadership",
    decision: "Confirm first leadership pilot group",
    owner: "Yujie Su",
    due: "2026-06-07",
    recommendation: "Prioritize for Scouting",
    finalDecision: "Pending",
    status: "Open",
    notes: "Agree required deliverables.",
  },
  {
    id: 2,
    project: "Cargo Insurance Tech Assessment",
    decision: "Run vendor PoC or internal prototype",
    owner: "CRM Innovation Lead",
    due: "2026-06-11",
    recommendation: "Select for PoC",
    finalDecision: "Pending",
    status: "Open",
    notes: "Needs value sizing and data check.",
  },
];

function normalizeProject(item) {
  const next = { ...emptyProject, ...item };
  if (next.stage && stageMigrationMap[next.stage]) next.stage = stageMigrationMap[next.stage];
  if (next.recommendation && recommendationMigrationMap[next.recommendation]) next.recommendation = recommendationMigrationMap[next.recommendation];
  return next;
}

function normalizeDecision(item) {
  return { ...emptyDecision, ...item };
}

function saveJson(name, payload) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

function saveCsv(name, rows) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const safe = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const csv = [headers.map(safe).join(","), ...rows.map((row) => headers.map((key) => safe(row[key])).join(","))].join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

function hydrateImportedState(raw) {
  if (!raw || typeof raw !== "object") throw new Error("Expected a JSON object.");
  const projects = Array.isArray(raw.projects) ? raw.projects : Array.isArray(raw[STORAGE_KEYS.projects]) ? raw[STORAGE_KEYS.projects] : null;
  const decisions = Array.isArray(raw.decisions) ? raw.decisions : Array.isArray(raw[STORAGE_KEYS.decisions]) ? raw[STORAGE_KEYS.decisions] : null;
  if (!projects || !decisions) throw new Error("JSON must include both projects and decisions arrays.");
  return {
    projects: projects.map(normalizeProject),
    decisions: decisions.map(normalizeDecision),
  };
}

function SuccessCriteriaEditor({ criteria, onChange }) {
  const [draft, setDraft] = useState("");

  const add = () => {
    const text = draft.trim();
    if (!text) return;
    onChange([...criteria, { id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, text, met: false }]);
    setDraft("");
  };

  return (
    <div className="space-y-3">
      {criteria.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-5 text-sm text-slate-500">
          No success criteria yet. A strong PoC defines 3-5 measurable pass/fail conditions up front.
        </div>
      ) : (
        <ul className="space-y-2">
          {criteria.map((criterion) => (
            <li key={criterion.id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
              <input
                type="checkbox"
                checked={Boolean(criterion.met)}
                onChange={() => onChange(criteria.map((item) => (item.id === criterion.id ? { ...item, met: !item.met } : item)))}
                className="h-4 w-4 shrink-0 rounded border-slate-300 accent-brand-600"
              />
              <Input
                value={criterion.text}
                onChange={(event) => onChange(criteria.map((item) => (item.id === criterion.id ? { ...item, text: event.target.value } : item)))}
                className="h-9 border-transparent shadow-none focus:border-brand-500"
              />
              <button
                type="button"
                onClick={() => onChange(criteria.filter((item) => item.id !== criterion.id))}
                className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
              >
                <Trash2 size={15} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); add(); } }}
          placeholder="e.g. Response accuracy above 90% on test set"
        />
        <Button type="button" variant="secondary" onClick={add}><Plus size={16} /> Add</Button>
      </div>
    </div>
  );
}

function TasksCard({ project, onAddTask, onToggleTask, onRemoveTask }) {
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const tasks = (project.tasks || []).slice().sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    return (daysUntil(a.due) ?? 999) - (daysUntil(b.due) ?? 999);
  });
  const progress = getTaskProgress(project);

  const add = () => {
    if (!title.trim()) return;
    onAddTask(project.id, { title, due });
    setTitle("");
    setDue("");
  };

  return (
    <Card className="border-slate-200/80 p-6">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-semibold text-slate-900"><ListChecks size={15} className="text-brand-600" /> Tasks</p>
        {progress.total > 0 && <span className="text-xs font-semibold text-slate-500">{progress.done}/{progress.total} done</span>}
      </div>
      {progress.total > 0 && (
        <div className="mt-3 h-1.5 rounded-full bg-slate-100">
          <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${progress.percent}%` }} />
        </div>
      )}
      <div className="mt-3 space-y-2">
        {tasks.length === 0 ? (
          <p className="text-sm leading-6 text-slate-500">No tasks yet. Break the next milestone into concrete steps.</p>
        ) : (
          tasks.map((task) => {
            const days = daysUntil(task.due);
            const overdue = days !== null && days < 0 && !task.done;
            return (
              <div key={task.id} className="group flex items-start gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                <input
                  type="checkbox"
                  checked={Boolean(task.done)}
                  onChange={() => onToggleTask(project.id, task.id)}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 accent-brand-600"
                />
                <div className="min-w-0 flex-1">
                  <p className={cx("text-sm leading-5", task.done ? "text-slate-400 line-through" : "text-slate-800")}>{task.title}</p>
                  {task.due && (
                    <p className={cx("mt-0.5 text-xs", overdue ? "font-semibold text-rose-600" : "text-slate-500")}>
                      {formatRelative(task.due)}{task.owner ? ` · ${task.owner}` : ""}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onRemoveTask(project.id, task.id)}
                  className="shrink-0 rounded-lg p-1 text-slate-300 opacity-0 transition group-hover:opacity-100 hover:bg-rose-50 hover:text-rose-600"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })
        )}
      </div>
      <div className="mt-3 space-y-2">
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); add(); } }}
          placeholder="Add a task…"
          className="h-10"
        />
        <div className="flex gap-2">
          <Input type="date" value={due} onChange={(event) => setDue(event.target.value)} className="h-10" />
          <Button type="button" variant="secondary" className="shrink-0 px-3 py-2" onClick={add}><Plus size={15} /></Button>
        </div>
      </div>
    </Card>
  );
}

function formatBytes(bytes) {
  const n = Number(bytes) || 0;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

const MAX_DOC_BYTES = 25 * 1024 * 1024; // 25 MB per file guardrail

const DOC_KINDS = {
  pdf: "bg-rose-50 text-rose-600 ring-rose-100",
  doc: "bg-blue-50 text-blue-600 ring-blue-100",
  docx: "bg-blue-50 text-blue-600 ring-blue-100",
  xls: "bg-emerald-50 text-emerald-600 ring-emerald-100",
  xlsx: "bg-emerald-50 text-emerald-600 ring-emerald-100",
  csv: "bg-emerald-50 text-emerald-600 ring-emerald-100",
  ppt: "bg-orange-50 text-orange-600 ring-orange-100",
  pptx: "bg-orange-50 text-orange-600 ring-orange-100",
  png: "bg-violet-50 text-violet-600 ring-violet-100",
  jpg: "bg-violet-50 text-violet-600 ring-violet-100",
  jpeg: "bg-violet-50 text-violet-600 ring-violet-100",
  gif: "bg-violet-50 text-violet-600 ring-violet-100",
  txt: "bg-slate-100 text-slate-500 ring-slate-200",
};

function docKind(name) {
  const ext = (String(name).split(".").pop() || "").toLowerCase();
  return {
    tag: ext ? ext.slice(0, 4).toUpperCase() : "FILE",
    className: DOC_KINDS[ext] || "bg-slate-100 text-slate-500 ring-slate-200",
  };
}

function DocumentsCard({ project, onAddDocuments, onRemoveDocument }) {
  const documents = project.documents || [];
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);

  const handleFiles = async (fileList) => {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;
    setError("");
    setBusy(true);
    const added = [];
    try {
      for (const file of files) {
        if (file.size > MAX_DOC_BYTES) {
          setError(`${file.name} is larger than 25 MB and was skipped.`);
          continue;
        }
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        await putDoc(id, file);
        added.push({ id, name: file.name, type: file.type || "", size: file.size, addedAt: new Date().toISOString() });
      }
      if (added.length) onAddDocuments(project.id, added);
    } catch {
      setError("Could not store the file in this browser.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const openDoc = async (meta, forceDownload = false) => {
    const blob = await getDoc(meta.id);
    if (!blob) {
      setError(`"${meta.name}" was uploaded in another browser and isn't stored here.`);
      return;
    }
    const url = URL.createObjectURL(blob);
    if (forceDownload) {
      const link = document.createElement("a");
      link.href = url;
      link.download = meta.name;
      link.click();
    } else {
      window.open(url, "_blank", "noopener,noreferrer");
    }
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };

  const onDrop = (event) => {
    event.preventDefault();
    setDragging(false);
    handleFiles(event.dataTransfer?.files);
  };

  return (
    <Card className="border-slate-200/80 p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-semibold text-slate-900"><Paperclip size={15} className="text-brand-600" /> Documents</p>
        {documents.length > 0 && (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">{documents.length} file{documents.length === 1 ? "" : "s"}</span>
        )}
      </div>

      <div className="mt-3 space-y-1.5">
        {documents.length === 0 ? (
          <p className="text-sm leading-6 text-slate-500">No documents yet. Upload POA packages, decks, or reference files to keep them with the project.</p>
        ) : (
          documents.map((doc) => {
            const kind = docKind(doc.name);
            return (
              <div key={doc.id} className="group flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-white px-2.5 py-2 transition hover:border-brand-200 hover:bg-brand-50/30 hover:shadow-sm">
                <div className={cx("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[9px] font-bold ring-1", kind.className)}>
                  {kind.tag}
                </div>
                <button
                  type="button"
                  onClick={() => openDoc(doc)}
                  className="min-w-0 flex-1 text-left"
                  title={`Open ${doc.name}`}
                >
                  <p className="truncate text-sm font-medium text-slate-800 group-hover:text-brand-700">{doc.name}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{formatBytes(doc.size)}{doc.addedAt ? ` · ${new Date(doc.addedAt).toLocaleDateString()}` : ""}</p>
                </button>
                <div className="flex shrink-0 items-center gap-0.5">
                  <button type="button" onClick={() => openDoc(doc)} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-brand-100 hover:text-brand-700" title="Open in new tab"><ExternalLink size={14} /></button>
                  <button type="button" onClick={() => openDoc(doc, true)} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-brand-100 hover:text-brand-700" title="Download"><Download size={14} /></button>
                  <button type="button" onClick={() => onRemoveDocument(project.id, doc.id)} className="rounded-lg p-1.5 text-slate-300 transition hover:bg-rose-50 hover:text-rose-600" title="Remove"><Trash2 size={14} /></button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {error && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs leading-5 text-rose-600">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(event) => handleFiles(event.target.files)}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current && inputRef.current.click()}
        onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cx(
          "mt-3 flex w-full flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed px-3 py-4 text-center transition",
          dragging ? "border-brand-400 bg-brand-50" : "border-slate-200 hover:border-brand-300 hover:bg-brand-50/40",
          busy && "opacity-60"
        )}
      >
        <span className={cx("flex h-9 w-9 items-center justify-center rounded-full", dragging ? "bg-brand-100 text-brand-700" : "bg-slate-100 text-slate-500")}>
          <Upload size={16} />
        </span>
        <span className="text-sm font-semibold text-slate-700">{busy ? "Uploading…" : dragging ? "Drop to upload" : "Upload documents"}</span>
        <span className="text-[11px] leading-4 text-slate-400">Click or drag files here · stored in this browser · up to 25 MB each</span>
      </button>
    </Card>
  );
}

function ProjectForm({ project, onSave, onClose }) {
  const [form, setForm] = useState(project ? { ...emptyProject, ...project } : emptyProject);
  const [activeStageTab, setActiveStageTab] = useState(project?.stage || "Problem Articulation");
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const stageCompletion = getStageCompletion(form, activeStageTab);

  useEffect(() => {
    setActiveStageTab(project?.stage || "Problem Articulation");
  }, [project?.id, project?.stage]);

  const setStageTab = (stage) => {
    setActiveStageTab(stage);
    set("stage", stage);
  };

  const activeStageIndex = stages.indexOf(activeStageTab);

  const submit = (event) => {
    event.preventDefault();
    if (!form.name.trim() || !form.owner.trim()) return;
    onSave({
      ...form,
      stage: activeStageTab,
      id: form.id || Date.now(),
      updatedAt: new Date().toISOString(),
    });
  };

  const formStages = {
    "Problem Articulation": (
      <div className="space-y-4">
        <StagePanel title="Project setup" description="Core business context and ownership for the problem request.">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Project name"><Input value={form.name} onChange={(e) => set("name", e.target.value)} /></Field>
            <Field label="Owner"><Input value={form.owner} onChange={(e) => set("owner", e.target.value)} /></Field>
            <Field label="Date requested"><Input type="date" value={form.dateRequested} onChange={(e) => set("dateRequested", e.target.value)} /></Field>
            <Field label="Business function / area"><Input value={form.businessFunction} onChange={(e) => set("businessFunction", e.target.value)} placeholder="e.g. Warehouse Safety / Security" /></Field>
            <Field label="Business stakeholder"><Input value={form.stakeholderName} onChange={(e) => set("stakeholderName", e.target.value)} /></Field>
            <Field label="Primary area / region"><Input value={form.regionScope} onChange={(e) => set("regionScope", e.target.value)} placeholder="e.g. USA / NAM" /></Field>
            <Field label="Product area"><Select value={form.productArea} onChange={(e) => set("productArea", e.target.value)} options={products} /></Field>
            <Field label="Priority"><Select value={form.priority} onChange={(e) => set("priority", e.target.value)} options={priorities} /></Field>
            <Field label="Status"><Select value={form.status} onChange={(e) => set("status", e.target.value)} options={statuses} /></Field>
            <Field label="Recommendation"><Select value={form.recommendation} onChange={(e) => set("recommendation", e.target.value)} options={recommendations} /></Field>
          </div>
        </StagePanel>
        <div className="grid gap-4 md:grid-cols-2">
          <StagePanel title="Problem statement">
            <Textarea value={form.problem} onChange={(e) => set("problem", e.target.value)} />
          </StagePanel>
          <StagePanel title="Impact">
            <Textarea value={form.impact} onChange={(e) => set("impact", e.target.value)} />
          </StagePanel>
          <StagePanel title="Financial impact">
            <Textarea value={form.financialImpact} onChange={(e) => set("financialImpact", e.target.value)} />
          </StagePanel>
          <StagePanel title="Objectives">
            <div className="space-y-3">
              <Field label="Primary objective"><Textarea value={form.objectivePrimary} onChange={(e) => set("objectivePrimary", e.target.value)} /></Field>
              <Field label="Secondary objective"><Textarea value={form.objectiveSecondary} onChange={(e) => set("objectiveSecondary", e.target.value)} /></Field>
            </div>
          </StagePanel>
        </div>
      </div>
    ),
    "Scouting": (
      <div className="space-y-4">
        <StagePanel title="Current state" description="Describe how the business handles this today and where the operational gaps are.">
          <Textarea value={form.currentChallenges} onChange={(e) => set("currentChallenges", e.target.value)} className="min-h-40" />
        </StagePanel>
        <div className="grid gap-4 md:grid-cols-2">
          <StagePanel title="Previous solutions tested">
            <Textarea value={form.previousSolutions} onChange={(e) => set("previousSolutions", e.target.value)} className="min-h-36" />
          </StagePanel>
          <StagePanel title="Blockers / risks">
            <Textarea value={form.blockers} onChange={(e) => set("blockers", e.target.value)} className="min-h-36" />
          </StagePanel>
        </div>
        <StagePanel title="Scouting notes">
          <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} className="min-h-32" />
        </StagePanel>
        <EditableTable
          title="Vendor curated list"
          description="Capture the longlist of vendors reviewed during scouting."
          rows={form.curatedVendors}
          onChange={(rows) => set("curatedVendors", rows)}
          createRow={(index) => ({ number: index + 1, vendorName: "", cluster: "", website: "", origin: "", fundingRound: "", description: "" })}
          columns={[
            { key: "vendorName", label: "Vendor name" },
            { key: "cluster", label: "Technology cluster" },
            { key: "website", label: "Website" },
            { key: "origin", label: "Origin" },
            { key: "fundingRound", label: "Funding round" },
            { key: "description", label: "Brief description", type: "textarea", wide: true, className: "min-h-28" },
          ]}
        />
        <EditableTable
          title="Top vendor selection"
          description="Track the partners moved into outreach and application handling."
          rows={form.selectedVendors}
          onChange={(rows) => set("selectedVendors", rows)}
          createRow={(index) => ({ number: index + 1, vendorName: "", contactEmail: "", contactName: "", role: "", contactReceived: "", formSent: "", formReceived: "" })}
          columns={[
            { key: "vendorName", label: "Vendor name" },
            { key: "contactName", label: "Contact name" },
            { key: "role", label: "Role" },
            { key: "contactEmail", label: "Contact email" },
            { key: "contactReceived", label: "Contact received" },
            { key: "formSent", label: "Application sent" },
            { key: "formReceived", label: "Application received" },
          ]}
        />
        <EditableTable
          title="Vendors selected for demo"
          description="Keep the demo shortlist, commercial signal, and key tradeoffs in one place."
          rows={form.demoVendors}
          onChange={(rows) => set("demoVendors", rows)}
          createRow={(index) => ({ number: index + 1, vendorName: "", demoDate: "", plus: "", minus: "", pocCost: "", deploymentCost: "" })}
          columns={[
            { key: "vendorName", label: "Vendor name" },
            { key: "demoDate", label: "Demo date" },
            { key: "pocCost", label: "PoC cost" },
            { key: "deploymentCost", label: "Deployment cost" },
            { key: "plus", label: "Strengths", type: "textarea", className: "min-h-24" },
            { key: "minus", label: "Weaknesses", type: "textarea", className: "min-h-24" },
          ]}
        />
        <EditableTable
          title="Vendor scorecards"
          description="Score the serious candidates so the partner decision is explicit instead of buried in notes."
          rows={form.vendorEvaluations}
          onChange={(rows) => set("vendorEvaluations", rows)}
          createRow={() => ({ vendorName: "", strategicFit: "", logisticsFit: "", integrationFit: "", securityReadiness: "", speedToValue: "", commercialFit: "", notes: "" })}
          columns={[
            { key: "vendorName", label: "Vendor name" },
            { key: "strategicFit", label: "Strategic fit (1-5)" },
            { key: "logisticsFit", label: "Logistics fit (1-5)" },
            { key: "integrationFit", label: "Integration fit (1-5)" },
            { key: "securityReadiness", label: "Security readiness (1-5)" },
            { key: "speedToValue", label: "Speed to value (1-5)" },
            { key: "commercialFit", label: "Commercial fit (1-5)" },
            { key: "notes", label: "Evaluation notes", type: "textarea", wide: true, className: "min-h-24" },
          ]}
        />
      </div>
    ),
    "POC": (
      <div className="space-y-4">
        <StagePanel title="Target solution" description="Describe the desired future state or concept to test.">
          <Textarea value={form.dreamScenario} onChange={(e) => set("dreamScenario", e.target.value)} className="min-h-40" />
        </StagePanel>
        <div className="grid gap-4 md:grid-cols-2">
          <StagePanel title="Resources required">
            <Textarea value={form.resourcesRequired} onChange={(e) => set("resourcesRequired", e.target.value)} className="min-h-32" />
          </StagePanel>
          <StagePanel title="Implementation risks">
            <Textarea value={form.implementationRisks} onChange={(e) => set("implementationRisks", e.target.value)} className="min-h-32" />
          </StagePanel>
        </div>
        <StagePanel title="Expected value">
          <Textarea value={form.value} onChange={(e) => set("value", e.target.value)} className="min-h-32" />
        </StagePanel>
        <StagePanel title="PoC charter" description="The testable commitment: hypothesis, timeline, budget, and outcome. This powers the PoC Hub.">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="PoC hypothesis" wide><Textarea value={form.pocHypothesis} onChange={(e) => set("pocHypothesis", e.target.value)} placeholder="We believe that [solution] will [measurable effect] for [users], proven by [evidence]." /></Field>
            <Field label="Start date"><Input type="date" value={form.pocStartDate} onChange={(e) => set("pocStartDate", e.target.value)} /></Field>
            <Field label="End date"><Input type="date" value={form.pocEndDate} onChange={(e) => set("pocEndDate", e.target.value)} /></Field>
            <Field label="Budget (USD)"><Input value={form.pocBudget} onChange={(e) => set("pocBudget", e.target.value)} placeholder="e.g. 25000" /></Field>
            <Field label="Spend to date (USD)"><Input value={form.pocSpend} onChange={(e) => set("pocSpend", e.target.value)} placeholder="e.g. 8000" /></Field>
            <Field label="Outcome"><Select value={form.pocOutcome || "Pending"} onChange={(e) => set("pocOutcome", e.target.value)} options={pocOutcomes} /></Field>
            <Field label="Learnings" wide><Textarea value={form.pocLearnings} onChange={(e) => set("pocLearnings", e.target.value)} placeholder="What the PoC proved, disproved, or surprised us with." /></Field>
          </div>
        </StagePanel>
        <StagePanel title="Success criteria" description="Measurable pass/fail conditions. These drive the go/no-go signal in the PoC Hub.">
          <SuccessCriteriaEditor criteria={form.pocSuccessCriteria || []} onChange={(rows) => set("pocSuccessCriteria", rows)} />
        </StagePanel>
        <StagePanel title="Partner application assessment" description="Capture the commercial and strategic decision basis for the preferred partner.">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Selected vendor">
              <Input list="selected-vendor-options" value={form.selectedVendor} onChange={(e) => set("selectedVendor", e.target.value)} placeholder="e.g. Pedestal AI" />
              <datalist id="selected-vendor-options">
                {getVendorLeaderboard(form).map((vendor) => <option key={vendor.vendorName} value={vendor.vendorName} />)}
              </datalist>
            </Field>
            <Field label="Recommendation"><Select value={form.recommendation} onChange={(e) => set("recommendation", e.target.value)} options={recommendations} /></Field>
            <Field label="Strategic alignment"><Textarea value={form.strategicAlignment} onChange={(e) => set("strategicAlignment", e.target.value)} className="min-h-28" /></Field>
            <Field label="Time to market"><Textarea value={form.timeToMarket} onChange={(e) => set("timeToMarket", e.target.value)} className="min-h-28" /></Field>
            <Field label="Capabilities fit"><Textarea value={form.capabilitiesFit} onChange={(e) => set("capabilitiesFit", e.target.value)} className="min-h-28" /></Field>
            <Field label="Partner recommendation summary"><Textarea value={form.partnerSummary} onChange={(e) => set("partnerSummary", e.target.value)} className="min-h-28" /></Field>
          </div>
        </StagePanel>
      </div>
    ),
    "Deployment Planning": (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <StagePanel title="Milestone plan">
            <div className="space-y-3">
              <Field label="Target date"><Input type="date" value={form.targetDate} onChange={(e) => set("targetDate", e.target.value)} /></Field>
              <Field label="Next milestone"><Input value={form.nextMilestone} onChange={(e) => set("nextMilestone", e.target.value)} /></Field>
            </div>
          </StagePanel>
          <StagePanel title="Planning notes">
            <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} className="min-h-36" />
          </StagePanel>
        </div>
        <StagePanel title="Recommendation">
          <Select value={form.recommendation} onChange={(e) => set("recommendation", e.target.value)} options={recommendations} />
        </StagePanel>
      </div>
    ),
    "Deployment Execution": (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <StagePanel title="Execution blockers">
            <Textarea value={form.blockers} onChange={(e) => set("blockers", e.target.value)} className="min-h-36" />
          </StagePanel>
          <StagePanel title="Current milestone">
            <div className="space-y-3">
              <Field label="Next milestone"><Input value={form.nextMilestone} onChange={(e) => set("nextMilestone", e.target.value)} /></Field>
              <Field label="Status"><Select value={form.status} onChange={(e) => set("status", e.target.value)} options={statuses} /></Field>
            </div>
          </StagePanel>
        </div>
        <StagePanel title="Execution notes">
          <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} className="min-h-32" />
        </StagePanel>
      </div>
    ),
    "Measuring Success": (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <StagePanel title="Outcome value">
            <Textarea value={form.value} onChange={(e) => set("value", e.target.value)} className="min-h-32" />
          </StagePanel>
          <StagePanel title="Scalability vision">
            <Textarea value={form.scalabilityVision} onChange={(e) => set("scalabilityVision", e.target.value)} className="min-h-32" />
          </StagePanel>
        </div>
        <StagePanel title="Financial impact">
          <Textarea value={form.financialImpact} onChange={(e) => set("financialImpact", e.target.value)} className="min-h-32" />
        </StagePanel>
        <StagePanel title="Outcome notes">
          <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} className="min-h-32" />
        </StagePanel>
      </div>
    ),
  };

  return (
    <Modal title={form.id ? "Edit project" : "New project"} subtitle="Project" fullscreen>
      <form onSubmit={submit}>
        <div className="space-y-6 bg-[#fbfcfe] px-8 py-6">
          <div className="mx-auto w-full max-w-[1600px] space-y-6">
            <div className="grid gap-4 xl:grid-cols-4">
              <Card className="border-slate-200/80 p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Owner</p>
                <p className="mt-2 text-sm text-slate-900">{form.owner || "Not set"}</p>
              </Card>
              <Card className="border-slate-200/80 p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Business function</p>
                <p className="mt-2 text-sm text-slate-900">{form.businessFunction || "Not set"}</p>
                <p className="mt-1 text-xs text-slate-500">{form.regionScope || "No primary region"}</p>
              </Card>
              <Card className="border-slate-200/80 p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Target date</p>
                <p className="mt-2 text-sm text-slate-900">{form.targetDate || "Not set"}</p>
              </Card>
              <Card className="border-slate-200/80 p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Current stage</p>
                <p className="mt-2 text-sm text-slate-900">{activeStageTab}</p>
              </Card>
            </div>

            <Card className="overflow-hidden border-slate-200/80 bg-white">
              <div className="border-b border-slate-200 bg-white px-6 py-5">
                <div className="flex gap-2 overflow-x-auto">
                  {stages.map((stage, index) => {
                    const isActive = stage === activeStageTab;
                    return (
                      <button
                        key={stage}
                        type="button"
                        onClick={() => setStageTab(stage)}
                        className={cx(
                          "inline-flex shrink-0 items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold transition",
                          isActive
                            ? "border-brand-500 bg-brand-50 text-brand-700"
                            : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-900"
                        )}
                      >
                        <span className={cx(
                          "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold",
                          isActive ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-500"
                        )}>
                          {index + 1}
                        </span>
                        <span className="whitespace-nowrap">{stage}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="border-b border-slate-200 bg-slate-50/40 px-6 py-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-brand-600">Workflow stage</p>
                    <h3 className="mt-1 text-2xl font-semibold text-slate-900">{activeStageTab}</h3>
                    <p className="mt-1 text-sm text-slate-500">Complete only the fields needed for this stage.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-500">
                      Step {activeStageIndex + 1} of {stages.length}
                    </div>
                    <div className="min-w-[160px]">
                      <div className="mb-1 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <span>Completion</span>
                        <span>{stageCompletion.completed}/{stageCompletion.total}</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-200">
                        <div className="h-2 rounded-full bg-brand-600" style={{ width: `${stageCompletion.percent}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-6">
                {formStages[activeStageTab]}
              </div>
            </Card>
          </div>
        </div>
        <div className="sticky bottom-0 border-t border-slate-200 bg-white/98 px-8 py-4 backdrop-blur">
          <div className="mx-auto flex w-full max-w-[1600px] flex-wrap items-center justify-between gap-3">
            <Button type="button" variant="secondary" className="rounded-full px-5" onClick={onClose}>Cancel</Button>
            <div className="flex flex-wrap gap-2">
              {activeStageIndex > 0 && (
                <Button type="button" variant="secondary" className="rounded-full px-5" onClick={() => setStageTab(stages[activeStageIndex - 1])}>
                  Previous
                </Button>
              )}
              {activeStageIndex < stages.length - 1 && (
                <Button type="button" variant="secondary" className="rounded-full px-5" onClick={() => setStageTab(stages[activeStageIndex + 1])}>
                  Next
                  <ChevronRight size={16} />
                </Button>
              )}
              <Button type="submit" className="rounded-full px-5">Save project</Button>
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
}

function DecisionForm({ decision, projects, onSave, onClose }) {
  const [form, setForm] = useState(decision ? { ...emptyDecision, ...decision } : { ...emptyDecision, project: projects[0]?.name || "" });
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const submit = (event) => {
    event.preventDefault();
    if (!form.project || !form.decision.trim()) return;
    onSave({
      ...form,
      id: form.id || Date.now(),
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <Modal title={form.id ? "Edit decision" : "New decision"} subtitle="Decision">
      <form onSubmit={submit}>
        <div className="grid gap-5 p-6 md:grid-cols-2">
          <Field label="Project">
            <Input
              list="project-options"
              value={form.project}
              onChange={(e) => set("project", e.target.value)}
              placeholder="Select or type project name"
            />
            <datalist id="project-options">
              {projects.map((project) => <option key={project.id} value={project.name} />)}
            </datalist>
          </Field>
          <Field label="Owner"><Input value={form.owner} onChange={(e) => set("owner", e.target.value)} /></Field>
          <Field label="Due date"><Input type="date" value={form.due} onChange={(e) => set("due", e.target.value)} /></Field>
          <Field label="Status"><Select value={form.status} onChange={(e) => set("status", e.target.value)} options={["Open", "Blocked", "Closed"]} /></Field>
          <Field label="Recommendation"><Select value={form.recommendation} onChange={(e) => set("recommendation", e.target.value)} options={recommendations} /></Field>
          <Field label="Final decision"><Input value={form.finalDecision} onChange={(e) => set("finalDecision", e.target.value)} /></Field>
          <Field label="Decision needed" wide><Textarea value={form.decision} onChange={(e) => set("decision", e.target.value)} /></Field>
          <Field label="Notes" wide><Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} /></Field>
        </div>
        <div className="flex justify-between border-t border-slate-200 p-6">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit">Save decision</Button>
        </div>
      </form>
    </Modal>
  );
}

function Overview({ projects, decisions, onOpenProject, onSetView }) {
  const openDecisions = decisions.filter((decision) => decision.status !== "Closed");
  const [showAllProjects, setShowAllProjects] = useState(false);

  const statusMix = statuses
    .map((status) => ({ name: status, value: projects.filter((project) => project.status === status).length }))
    .filter((item) => item.value > 0);

  const upcomingMilestones = projects
    .filter((project) => project.targetDate && project.status !== "Completed")
    .map((project) => ({ project, days: daysUntil(project.targetDate) }))
    .filter(({ days }) => days !== null && days >= 0 && days <= 45)
    .sort((a, b) => a.days - b.days)
    .slice(0, 5);

  const urgentDecisions = openDecisions
    .slice()
    .sort((a, b) => (daysUntil(a.due) ?? 999) - (daysUntil(b.due) ?? 999))
    .slice(0, 5);
  const orderedProjects = projects
    .map((project) => ({ ...project, health: getProjectHealth(project) }))
    .sort((a, b) => {
      const order = { critical: 0, watch: 1, stable: 2 };
      const byHealth = (order[a.health] ?? 9) - (order[b.health] ?? 9);
      if (byHealth !== 0) return byHealth;
      return (daysUntil(a.targetDate) ?? 999) - (daysUntil(b.targetDate) ?? 999);
    });
  const visibleProjects = showAllProjects ? orderedProjects : orderedProjects.slice(0, 3);

  const byStage = stages.map((stage) => ({
    stage,
    count: projects.filter((project) => project.stage === stage).length,
  }));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Projects" value={projects.length} helper="Tracked portfolio items" icon={FolderKanban} />
        <MetricCard title="Open decisions" value={openDecisions.length} helper="Pending alignment" icon={ClipboardCheck} />
        <MetricCard title="At risk" value={projects.filter((project) => ["Red", "Blocked"].includes(project.status)).length} helper="Red or blocked items" icon={AlertTriangle} />
        <MetricCard title="Completed" value={projects.filter((project) => project.status === "Completed").length} helper="Delivered or closed" icon={CheckCircle2} />
      </div>

      <Card className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-brand-600">Portfolio queue</p>
            <h3 className="mt-1 text-xl font-semibold text-slate-900">Projects to review</h3>
            <p className="mt-1 text-sm text-slate-500">Highest-risk and soonest-due initiatives first.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {orderedProjects.length > 3 && (
              <Button variant="secondary" onClick={() => setShowAllProjects((current) => !current)}>
                {showAllProjects ? "Show less" : `Show all (${orderedProjects.length})`}
              </Button>
            )}
            <Button variant="secondary" onClick={() => onSetView("Projects")}>Open projects</Button>
          </div>
        </div>
        <div className="mt-5">
          {orderedProjects.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-5 text-sm text-slate-500">No projects available.</div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {visibleProjects.map((project) => (
                <button key={project.id} onClick={() => onOpenProject(project)} className="flex h-full items-start justify-between gap-3 rounded-2xl border border-slate-200 p-4 text-left transition hover:border-brand-200 hover:bg-brand-50/60">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">{project.name}</p>
                    <p className="mt-1 text-sm text-slate-500">{project.stage} · {project.owner} · {formatRelative(project.targetDate)}</p>
                    {project.nextMilestone && <p className="mt-2 line-clamp-2 text-sm text-slate-700">Next: {project.nextMilestone}</p>}
                  </div>
                  <Badge tone={project.health}>{project.health === "critical" ? "Needs action" : "Watch"}</Badge>
                </button>
              ))}
            </div>
          )}
          {!showAllProjects && orderedProjects.length > 3 && (
            <button
              type="button"
              onClick={() => setShowAllProjects(true)}
              className="mt-3 flex w-full items-center justify-center rounded-2xl border border-dashed border-slate-300 px-4 py-4 text-sm font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
            >
              Show {orderedProjects.length - 3} more projects
            </button>
          )}
        </div>
      </Card>

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-5">
          <p className="text-sm font-semibold text-brand-600">Stage distribution</p>
          <div className="mt-5 space-y-4">
            {byStage.map((item) => (
              <div key={item.stage}>
                <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                  <span className="truncate text-slate-700">{item.stage}</span>
                  <span className="font-semibold text-slate-900">{item.count}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div className="h-2 rounded-full bg-brand-600" style={{ width: `${projects.length ? (item.count / projects.length) * 100 : 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-5">
          <p className="text-sm font-semibold text-brand-600">Health mix</p>
          <div className="mt-2 h-52">
            {statusMix.length === 0 ? (
              <p className="pt-8 text-center text-sm text-slate-400">No projects yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusMix} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="82%" paddingAngle={3}>
                    {statusMix.map((entry) => (
                      <Cell key={entry.name} fill={STATUS_BAR[entry.name]?.hex || "#64748b"} />
                    ))}
                  </Pie>
                  <ChartTooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 13 }} />
                  <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-brand-600">Upcoming milestones</p>
            <span className="text-xs text-slate-400">Next 45 days</span>
          </div>
          <div className="mt-4 space-y-2.5">
            {upcomingMilestones.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">Nothing due in the next 45 days.</p>
            ) : (
              upcomingMilestones.map(({ project, days }) => (
                <button
                  key={project.id}
                  onClick={() => onOpenProject(project)}
                  className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2.5 text-left transition hover:border-brand-200 hover:bg-brand-50/50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{project.name}</p>
                    <p className="truncate text-xs text-slate-500">{project.nextMilestone || project.stage}</p>
                  </div>
                  <Badge tone={days <= 7 ? "watch" : "default"}>{days === 0 ? "Today" : `${days}d`}</Badge>
                </button>
              ))
            )}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-brand-600">Decisions needing attention</p>
            <Button variant="ghost" className="px-2 py-1 text-xs" onClick={() => onSetView("Decisions")}>View all</Button>
          </div>
          <div className="mt-4 space-y-2.5">
            {urgentDecisions.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">No open decisions. Nice.</p>
            ) : (
              urgentDecisions.map((decision) => {
                const days = daysUntil(decision.due);
                const overdue = days !== null && days < 0;
                return (
                  <div key={decision.id} className="rounded-xl border border-slate-200 px-3 py-2.5">
                    <p className="truncate text-sm font-semibold text-slate-900">{decision.decision}</p>
                    <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-slate-500">
                      <span className="truncate">{decision.project}</span>
                      <span>·</span>
                      <span className={overdue ? "font-semibold text-rose-600" : ""}>{formatRelative(decision.due)}</span>
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>

    </div>
  );
}

function ProjectsView({ projects, onOpenProject, onNewProject, onAdvanceStage, onStatusChange }) {
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState("All");
  const [status, setStatus] = useState("All");

  const filtered = useMemo(() => {
    return projects.filter((project) => {
      const haystack = [project.name, project.owner, project.productArea, project.problem].join(" ").toLowerCase();
      const matchesQuery = haystack.includes(query.toLowerCase());
      const matchesStage = stage === "All" || project.stage === stage;
      const matchesStatus = status === "All" || project.status === status;
      return matchesQuery && matchesStage && matchesStatus;
    });
  }, [projects, query, stage, status]);

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Projects</h3>
            <p className="text-sm text-slate-500">Portfolio execution view across ownership, stage, timing, and risk.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="relative min-w-[220px]">
              <Search className="absolute left-3 top-3 text-slate-400" size={16} />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search projects" className="pl-9" />
            </div>
            <select value={stage} onChange={(e) => setStage(e.target.value)} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm">
              <option>All</option>
              {stages.map((item) => <option key={item}>{item}</option>)}
            </select>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm">
              <option>All</option>
              {statuses.map((item) => <option key={item}>{item}</option>)}
            </select>
            <Button onClick={onNewProject}><Plus size={16} /> New project</Button>
          </div>
        </div>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState title="No projects found" text="Adjust the filters or create a new project." action={<Button onClick={onNewProject}><Plus size={16} /> New project</Button>} />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3">Project</th>
                  <th className="px-5 py-3">Owner</th>
                  <th className="px-5 py-3">Stage</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Priority</th>
                  <th className="px-5 py-3">Target</th>
                  <th className="px-5 py-3">Next milestone</th>
                  <th className="px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((project) => {
                  const upcoming = nextStage(project.stage);
                  const completion = getStageCompletion(project, project.stage);
                  return (
                    <tr key={project.id} className="hover:bg-brand-50/30">
                      <td className="px-5 py-4">
                        <button onClick={() => onOpenProject(project)} className="text-left">
                          <p className="font-semibold text-slate-900">{project.name}</p>
                          <p className="mt-1 text-xs text-slate-500">{project.productArea} · {project.businessFunction || "No business function"}</p>
                        </button>
                      </td>
                      <td className="px-5 py-4 text-slate-700">{project.owner}</td>
                      <td className="px-5 py-4">
                        <div className="text-slate-700">{project.stage}</div>
                        <div className="mt-1 text-xs text-slate-500">{completion.completed}/{completion.total} checks complete</div>
                      </td>
                      <td className="px-5 py-4">
                        <select value={project.status} onChange={(e) => onStatusChange(project.id, e.target.value)} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700">
                          {statuses.map((item) => <option key={item}>{item}</option>)}
                        </select>
                      </td>
                      <td className="px-5 py-4"><Badge tone={project.priority}>{project.priority}</Badge></td>
                      <td className="px-5 py-4">
                        <div className="text-slate-700">{project.targetDate || "—"}</div>
                        <div className="mt-1 text-xs text-slate-500">{formatRelative(project.targetDate)}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-slate-700">{project.nextMilestone || "—"}</div>
                        {(project.tasks || []).length > 0 && (
                          <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                            <ListChecks size={12} /> {getTaskProgress(project).done}/{getTaskProgress(project).total} tasks
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <Button variant="secondary" className="px-3 py-2 text-xs" onClick={() => onOpenProject(project)}>Open</Button>
                          {upcoming && <Button className="px-3 py-2 text-xs" onClick={() => onAdvanceStage(project.id)}>{upcoming}</Button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

function RoadmapView({ projects, onOpenProject, onNewProject }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const monthWidth = 116;
  const leftWidth = 256;
  const rowHeight = 52;
  const headerHeight = 48;

  const filtered = useMemo(() => {
    return projects.filter((project) => {
      const haystack = [project.name, project.owner, project.productArea].join(" ").toLowerCase();
      const matchesQuery = haystack.includes(query.toLowerCase());
      const matchesStatus = status === "All" || project.status === status;
      return matchesQuery && matchesStatus;
    });
  }, [projects, query, status]);

  const { scheduled, unscheduled } = useMemo(() => {
    const withDates = [];
    const without = [];
    for (const project of filtered) {
      const startRaw = parseDate(project.dateRequested) || parseDate(project.targetDate);
      const endRaw = parseDate(project.targetDate) || parseDate(project.dateRequested);
      if (!startRaw && !endRaw) {
        without.push(project);
        continue;
      }
      const start = startOfDay(startRaw);
      let end = startOfDay(endRaw);
      if (end.getTime() < start.getTime()) end = start;
      withDates.push({ project, start, end });
    }
    return { scheduled: withDates, unscheduled: without };
  }, [filtered]);

  const today = startOfDay(new Date());

  const range = useMemo(() => {
    if (!scheduled.length) return null;
    let min = scheduled[0].start;
    let max = scheduled[0].end;
    for (const item of scheduled) {
      if (item.start.getTime() < min.getTime()) min = item.start;
      if (item.end.getTime() > max.getTime()) max = item.end;
    }
    const earliest = min.getTime() < today.getTime() ? min : today;
    const latest = max.getTime() > today.getTime() ? max : today;
    const rangeStart = startOfMonth(earliest);
    const rangeEndMonth = addMonths(startOfMonth(latest), 1);
    const monthCount = Math.max(monthsBetween(rangeStart, rangeEndMonth), 1);
    return { rangeStart, monthCount };
  }, [scheduled, today]);

  const summary = useMemo(() => {
    let onTrack = 0;
    let atRisk = 0;
    let critical = 0;
    let overdue = 0;
    for (const project of filtered) {
      const days = daysUntil(project.targetDate);
      const isOverdue = days !== null && days < 0 && project.status !== "Completed";
      if (isOverdue) overdue += 1;
      if (project.status === "Red" || project.status === "Blocked") critical += 1;
      else if (project.status === "Amber") atRisk += 1;
      else onTrack += 1;
    }
    return { onTrack, atRisk, critical, overdue, unscheduled: unscheduled.length };
  }, [filtered, unscheduled]);

  const groups = useMemo(() => {
    return stages
      .map((stage) => ({
        stage,
        items: scheduled
          .filter((item) => item.project.stage === stage)
          .sort((a, b) => a.start.getTime() - b.start.getTime()),
      }))
      .filter((group) => group.items.length > 0);
  }, [scheduled]);

  const timelineWidth = range ? range.monthCount * monthWidth : 0;
  const months = range
    ? Array.from({ length: range.monthCount }, (_, index) => addMonths(range.rangeStart, index))
    : [];
  const todayOffset = range ? dateToOffset(today, range.rangeStart, monthWidth) : 0;
  const gridBackground = {
    backgroundImage: `repeating-linear-gradient(to right, #eef2f6 0, #eef2f6 1px, transparent 1px, transparent ${monthWidth}px)`,
  };

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Roadmap</h3>
            <p className="text-sm text-slate-500">Delivery timeline from request to target date, grouped by workflow stage.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="relative min-w-[220px]">
              <Search className="absolute left-3 top-3 text-slate-400" size={16} />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search projects" className="pl-9" />
            </div>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm">
              <option>All</option>
              {statuses.map((item) => <option key={item}>{item}</option>)}
            </select>
            <Button onClick={onNewProject}><Plus size={16} /> New project</Button>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge tone="stable">On track {summary.onTrack}</Badge>
          <Badge tone="watch">At risk {summary.atRisk}</Badge>
          <Badge tone="critical">Critical {summary.critical}</Badge>
          <Badge tone="Red">Overdue {summary.overdue}</Badge>
          <Badge tone="default">Unscheduled {summary.unscheduled}</Badge>
        </div>
      </Card>

      {groups.length === 0 ? (
        <EmptyState
          title="Nothing scheduled yet"
          text="Add a requested date and a target date to a project to place it on the roadmap."
          action={<Button onClick={onNewProject}><Plus size={16} /> New project</Button>}
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <div className="relative" style={{ minWidth: leftWidth + timelineWidth }}>
              <div
                className="pointer-events-none absolute bottom-0 z-0 w-px bg-rose-400"
                style={{ left: leftWidth + todayOffset, top: headerHeight }}
              >
                <span className="absolute -top-px -translate-x-1/2 rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-semibold text-white">Today</span>
              </div>

              <div className="flex border-b border-slate-200" style={{ height: headerHeight }}>
                <div className="sticky left-0 z-20 flex shrink-0 items-end bg-white px-5 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-500" style={{ width: leftWidth }}>
                  Project
                </div>
                <div className="relative shrink-0" style={{ width: timelineWidth }}>
                  {months.map((month, index) => (
                    <div key={index} className="absolute bottom-2 text-xs text-slate-500" style={{ left: index * monthWidth + 8 }}>
                      <span className="font-semibold text-slate-600">{month.toLocaleDateString(undefined, { month: "short" })}</span>
                      {(month.getMonth() === 0 || index === 0) && <span className="ml-1 text-slate-400">{month.getFullYear()}</span>}
                    </div>
                  ))}
                </div>
              </div>

              {groups.map((group) => (
                <div key={group.stage}>
                  <div className="flex border-b border-slate-100 bg-slate-50/70">
                    <div className="sticky left-0 z-20 flex shrink-0 items-center gap-2 bg-slate-50/70 px-5 py-2.5" style={{ width: leftWidth }}>
                      <span className="text-sm font-semibold text-slate-700">{group.stage}</span>
                      <span className="rounded-full bg-white px-2 py-0.5 text-xs text-slate-500">{group.items.length}</span>
                    </div>
                    <div className="shrink-0" style={{ width: timelineWidth }} />
                  </div>

                  {group.items.map(({ project, start, end }) => {
                    const palette = STATUS_BAR[project.status] || STATUS_BAR.Green;
                    const left = dateToOffset(start, range.rangeStart, monthWidth);
                    const width = Math.max(dateToOffset(end, range.rangeStart, monthWidth) - left, 8);
                    const days = daysUntil(project.targetDate);
                    const isOverdue = days !== null && days < 0 && project.status !== "Completed";
                    return (
                      <div key={project.id} className="flex border-b border-slate-100 last:border-b-0 hover:bg-brand-50/30">
                        <button
                          onClick={() => onOpenProject(project)}
                          className="sticky left-0 z-20 flex shrink-0 flex-col justify-center bg-white px-5 text-left hover:bg-brand-50/60"
                          style={{ width: leftWidth, height: rowHeight }}
                        >
                          <span className="flex items-center gap-1.5 truncate text-sm font-semibold text-slate-900">
                            {isOverdue && <AlertTriangle size={13} className="shrink-0 text-rose-500" />}
                            <span className="truncate">{project.name}</span>
                          </span>
                          <span className="truncate text-xs text-slate-500">{project.owner || "Unassigned"}</span>
                        </button>
                        <div className="relative shrink-0" style={{ width: timelineWidth, height: rowHeight, ...gridBackground }}>
                          <button
                            onClick={() => onOpenProject(project)}
                            title={`${project.name} · ${formatShortDate(project.dateRequested)} → ${formatShortDate(project.targetDate)}`}
                            className={cx(
                              "group absolute top-1/2 z-10 flex h-7 -translate-y-1/2 items-center rounded-lg px-2 text-xs font-medium text-white shadow-sm transition hover:brightness-95",
                              palette.bar,
                              isOverdue && "ring-2 ring-rose-300"
                            )}
                            style={{ left, width }}
                          >
                            <span className="truncate">{formatRelative(project.targetDate)}</span>
                            <Flag size={12} className="ml-1 shrink-0 opacity-80" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {unscheduled.length > 0 && (
        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <CalendarDays size={16} className="text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-900">Unscheduled</h3>
            <span className="text-xs text-slate-500">No requested or target date set</span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {unscheduled.map((project) => (
              <button
                key={project.id}
                onClick={() => onOpenProject(project)}
                className="rounded-xl border border-dashed border-slate-200 p-3 text-left transition hover:border-brand-400 hover:bg-brand-50/60"
              >
                <p className="truncate text-sm font-semibold text-slate-900">{project.name}</p>
                <p className="mt-1 truncate text-xs text-slate-500">{project.stage} · {project.owner || "Unassigned"}</p>
              </button>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function PocCharterPanel({ project }) {
  const progress = getPocCriteriaProgress(project);
  const budget = parseAmount(project.pocBudget);
  const spend = parseAmount(project.pocSpend) ?? 0;
  const daysLeft = daysUntil(project.pocEndDate);
  const hasCharter = hasValue(project.pocHypothesis) || progress.total > 0 || budget !== null;

  return (
    <StagePanel title="PoC charter" description="The testable commitment behind this proof of concept.">
      {!hasCharter ? (
        <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-4 text-sm text-slate-500">
          No PoC charter yet. Edit the project and complete the POC stage to define the hypothesis, success criteria, and budget.
        </p>
      ) : (
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Hypothesis</p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{project.pocHypothesis || "Not provided."}</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl bg-slate-50 px-3 py-2.5">
              <p className="text-xs text-slate-500">Timeline</p>
              <p className="mt-1 text-sm font-semibold text-slate-800">{formatShortDate(project.pocStartDate)} → {formatShortDate(project.pocEndDate)}</p>
              {daysLeft !== null && (
                <p className={cx("mt-0.5 text-xs", daysLeft < 0 ? "font-semibold text-rose-600" : "text-slate-500")}>
                  {daysLeft < 0 ? `${Math.abs(daysLeft)}d over` : `${daysLeft}d remaining`}
                </p>
              )}
            </div>
            <div className="rounded-xl bg-slate-50 px-3 py-2.5">
              <p className="text-xs text-slate-500">Budget</p>
              <p className="mt-1 text-sm font-semibold text-slate-800">
                {budget === null ? "Not set" : `${formatAmount(spend)} / ${formatAmount(budget)}`}
              </p>
              {budget !== null && (
                <div className="mt-1.5 h-1.5 rounded-full bg-slate-200">
                  <div className={cx("h-1.5 rounded-full", spend > budget ? "bg-rose-500" : "bg-brand-600")} style={{ width: `${Math.min(Math.round((spend / budget) * 100), 100)}%` }} />
                </div>
              )}
            </div>
            <div className="rounded-xl bg-slate-50 px-3 py-2.5">
              <p className="text-xs text-slate-500">Outcome</p>
              <p className="mt-1 text-sm font-semibold text-slate-800">{project.pocOutcome || "Pending"}</p>
              {progress.total > 0 && <p className="mt-0.5 text-xs text-slate-500">{progress.met}/{progress.total} criteria met</p>}
            </div>
          </div>
          {progress.total > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Success criteria</p>
              <ul className="mt-2 space-y-1.5">
                {(project.pocSuccessCriteria || []).map((criterion) => (
                  <li key={criterion.id} className="flex items-start gap-2 text-sm leading-5">
                    {criterion.met
                      ? <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-500" />
                      : <Target size={16} className="mt-0.5 shrink-0 text-slate-300" />}
                    <span className={criterion.met ? "text-slate-500" : "text-slate-700"}>{criterion.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {project.pocLearnings && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Learnings</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{project.pocLearnings}</p>
            </div>
          )}
        </div>
      )}
    </StagePanel>
  );
}

function ProjectDetail({ project, decisions, onClose, onEdit, onDelete, onAdvanceStage, onAddTask, onToggleTask, onRemoveTask, onAddDocuments, onRemoveDocument }) {
  if (!project) return null;
  const relatedDecisions = decisions.filter((decision) => decision.project === project.name && decision.status !== "Closed");
  const upcoming = nextStage(project.stage);
  const health = getProjectHealth(project);
  const [activeStageTab, setActiveStageTab] = useState(project.stage);

  useEffect(() => {
    setActiveStageTab(project.stage);
  }, [project.id, project.stage]);

  const stageIndex = stages.indexOf(project.stage);
  const activeStageIndex = stages.indexOf(activeStageTab);
  const decisionGuide = getStageDecisionGuide(project, activeStageTab, relatedDecisions);
  const stageCompletion = getStageCompletion(project, activeStageTab);
  const vendorLeaderboard = getVendorLeaderboard(project);

  const stageCards = {
    "Problem Articulation": (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <StagePanel title="Problem statement">
            <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{project.problem || "Not provided."}</p>
          </StagePanel>
          <StagePanel title="Impact">
            <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{project.impact || "Not provided."}</p>
          </StagePanel>
          <StagePanel title="Financial impact">
            <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{project.financialImpact || "Not provided."}</p>
          </StagePanel>
          <StagePanel title="Objectives">
            <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{project.objectivePrimary || "Not provided."}</p>
            {project.objectiveSecondary && <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">{project.objectiveSecondary}</p>}
          </StagePanel>
        </div>
        <StagePanel title="Discovery context" description="Business ownership and request origin for the problem statement.">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Business stakeholder</p>
              <p className="mt-2 text-sm text-slate-800">{project.stakeholderName || "Not provided."}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Date requested</p>
              <p className="mt-2 text-sm text-slate-800">{project.dateRequested || "Not provided."}</p>
            </div>
          </div>
        </StagePanel>
      </div>
    ),
    "Scouting": (
      <div className="space-y-4">
        <StagePanel title="Current state" description="How the problem is handled today and where the gaps are.">
          <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{project.currentChallenges || "Not provided."}</p>
        </StagePanel>
        <div className="grid gap-4 md:grid-cols-2">
          <StagePanel title="Previous solutions tested">
            <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{project.previousSolutions || "Not provided."}</p>
          </StagePanel>
          <StagePanel title="Blockers">
            <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{project.blockers || "Not provided."}</p>
          </StagePanel>
        </div>
        <StagePanel title="Scouting notes">
          <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{project.notes || "No notes recorded."}</p>
        </StagePanel>
        <StagePanel title="Vendor curated list" description="Longlist of vendors reviewed during scouting.">
          <MiniTable
            columns={[
              { key: "number", label: "#" },
              { key: "vendorName", label: "Vendor" },
              { key: "cluster", label: "Cluster" },
              { key: "origin", label: "Origin" },
              { key: "fundingRound", label: "Funding" },
              { key: "website", label: "Website" },
            ]}
            rows={project.curatedVendors || []}
            emptyText="No curated vendor list yet."
          />
        </StagePanel>
        <StagePanel title="Top vendor selection" description="Shortlisted vendors taken forward for partner outreach.">
          <MiniTable
            columns={[
              { key: "number", label: "#" },
              { key: "vendorName", label: "Vendor" },
              { key: "contactName", label: "Contact" },
              { key: "role", label: "Role" },
              { key: "contactReceived", label: "Contact received" },
              { key: "formSent", label: "Form sent" },
              { key: "formReceived", label: "Form received" },
            ]}
            rows={project.selectedVendors || []}
            emptyText="No shortlisted vendors yet."
          />
        </StagePanel>
        <StagePanel title="Vendors selected for demo" description="Commercial and qualitative observations from the demo shortlist.">
          <MiniTable
            columns={[
              { key: "number", label: "#" },
              { key: "vendorName", label: "Vendor" },
              { key: "demoDate", label: "Demo date" },
              { key: "plus", label: "+" },
              { key: "minus", label: "-" },
              { key: "pocCost", label: "PoC cost" },
              { key: "deploymentCost", label: "Deployment cost" },
            ]}
            rows={project.demoVendors || []}
            emptyText="No demo vendors yet."
          />
        </StagePanel>
        <StagePanel title="Vendor ranking" description="Scored comparison of the serious candidates for partner selection.">
          <MiniTable
            columns={[
              { key: "vendorName", label: "Vendor" },
              { key: "score", label: "Score / 5" },
              { key: "strategicFit", label: "Strategic" },
              { key: "speedToValue", label: "Speed" },
              { key: "commercialFit", label: "Commercial" },
              { key: "notes", label: "Notes" },
            ]}
            rows={vendorLeaderboard}
            emptyText="No vendor scorecards yet."
          />
        </StagePanel>
      </div>
    ),
    "POC": (
      <div className="space-y-4">
        <PocCharterPanel project={project} />
        <StagePanel title="Target solution" description="What the proposed solution should deliver at proof-of-concept stage.">
          <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{project.dreamScenario || "Not provided."}</p>
        </StagePanel>
        <div className="grid gap-4 md:grid-cols-2">
          <StagePanel title="Resources required">
            <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{project.resourcesRequired || "Not provided."}</p>
          </StagePanel>
          <StagePanel title="Implementation risks">
            <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{project.implementationRisks || "Not provided."}</p>
          </StagePanel>
        </div>
        <StagePanel title="Expected value">
          <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{project.value || "Not provided."}</p>
        </StagePanel>
        <StagePanel title="Partner application assessment" description="Why this partner or route should move forward into proof of concept.">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Selected vendor</p>
              <p className="mt-2 text-sm leading-6 text-slate-800">{project.selectedVendor || "Not selected."}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Recommendation</p>
              <p className="mt-2 text-sm leading-6 text-slate-800">{project.recommendation || "Not provided."}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Strategic alignment</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{project.strategicAlignment || "Not provided."}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Time to market</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{project.timeToMarket || "Not provided."}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Capabilities fit</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{project.capabilitiesFit || "Not provided."}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Partner recommendation summary</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{project.partnerSummary || "Not provided."}</p>
            </div>
          </div>
        </StagePanel>
      </div>
    ),
    "Deployment Planning": (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <StagePanel title="Recommendation">
            <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{project.recommendation || "Not provided."}</p>
          </StagePanel>
          <StagePanel title="Next milestone">
            <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{project.nextMilestone || "Not provided."}</p>
          </StagePanel>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <StagePanel title="Target date">
            <p className="text-sm leading-6 text-slate-700">{project.targetDate || "Not provided."}</p>
          </StagePanel>
          <StagePanel title="Resources required">
            <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{project.resourcesRequired || "Not provided."}</p>
          </StagePanel>
        </div>
        <StagePanel title="Deployment planning notes">
          <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{project.notes || "No notes recorded."}</p>
        </StagePanel>
      </div>
    ),
    "Deployment Execution": (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <StagePanel title="Execution blockers">
            <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{project.blockers || "Not provided."}</p>
          </StagePanel>
          <StagePanel title="Current milestone">
            <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{project.nextMilestone || "Not provided."}</p>
          </StagePanel>
        </div>
        <StagePanel title="Related decisions" description="Open decisions that affect execution progress.">
          <div className="space-y-3">
            {relatedDecisions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">No open decisions linked to this project.</div>
            ) : (
              relatedDecisions.map((decision) => (
                <div key={decision.id} className="rounded-2xl border border-slate-200 p-4">
                  <p className="font-semibold text-slate-900">{decision.decision}</p>
                  <p className="mt-1 text-sm text-slate-500">{decision.owner || "No owner"} · {formatRelative(decision.due)}</p>
                </div>
              ))
            )}
          </div>
        </StagePanel>
      </div>
    ),
    "Measuring Success": (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <StagePanel title="Financial impact">
            <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{project.financialImpact || "Not provided."}</p>
          </StagePanel>
          <StagePanel title="Scalability vision">
            <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{project.scalabilityVision || "Not provided."}</p>
          </StagePanel>
        </div>
        <StagePanel title="Expected value">
          <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{project.value || "Not provided."}</p>
        </StagePanel>
        <StagePanel title="Outcome notes">
          <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{project.notes || "No notes recorded."}</p>
        </StagePanel>
      </div>
    ),
  };

  return (
    <Modal title={project.name} subtitle="Project detail" onClose={onClose} fullscreen>
      <div className="space-y-6 bg-[#fbfcfe] px-8 py-6">
        <div className="mx-auto w-full max-w-[1600px] space-y-6">
        <div className="flex flex-wrap gap-2">
          <Badge tone={project.status}>{project.status}</Badge>
          <Badge tone={project.priority}>{project.priority}</Badge>
          <Badge>{project.stage}</Badge>
          <Badge tone={health}>{health === "critical" ? "Needs action" : health === "watch" ? "Watch" : "Stable"}</Badge>
        </div>

        <div className="grid gap-4 xl:grid-cols-4">
          <Card className="border-slate-200/80 p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Owner</p>
            <p className="mt-2 flex items-center gap-2 text-sm text-slate-900"><User size={16} className="text-brand-600" />{project.owner}</p>
          </Card>
          <Card className="border-slate-200/80 p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Business function</p>
            <p className="mt-2 text-sm text-slate-900">{project.businessFunction || "Not set"}</p>
            <p className="mt-1 text-xs text-slate-500">{project.regionScope || "No primary region"}</p>
          </Card>
          <Card className="border-slate-200/80 p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Target date</p>
            <p className="mt-2 flex items-center gap-2 text-sm text-slate-900"><CalendarDays size={16} className="text-brand-600" />{project.targetDate || "No date"}</p>
            <p className="mt-1 text-xs text-slate-500">{formatRelative(project.targetDate)}</p>
          </Card>
          <Card className="border-slate-200/80 p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Recommendation</p>
            <p className="mt-2 flex items-center gap-2 text-sm text-slate-900"><Flag size={16} className="text-brand-600" />{project.recommendation}</p>
          </Card>
        </div>

        <Card className="overflow-hidden border-slate-200/80 bg-white">
          <div className="border-b border-slate-200 bg-white px-6 py-5">
            <div className="flex gap-2 overflow-x-auto">
              {stages.map((stage, index) => {
                const isCurrent = stage === project.stage;
                const isActive = stage === activeStageTab;
                const isComplete = index < stageIndex;
                return (
                  <button
                    key={stage}
                    type="button"
                    onClick={() => setActiveStageTab(stage)}
                    className={cx(
                      "inline-flex shrink-0 items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold transition",
                      isActive
                        ? "border-brand-500 bg-brand-50 text-brand-700"
                        : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-900"
                    )}
                  >
                    <span className={cx(
                      "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold",
                      isCurrent
                        ? "bg-brand-600 text-white"
                        : isComplete
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-500"
                    )}>
                      {index + 1}
                    </span>
                    <span className="whitespace-nowrap">{stage}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="border-b border-slate-200 bg-slate-50/40 px-6 py-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-semibold text-brand-600">Workflow stage</p>
                <h3 className="mt-1 text-2xl font-semibold text-slate-900">{activeStageTab}</h3>
                <p className="mt-1 text-sm text-slate-500">
                  {activeStageIndex < stageIndex
                    ? "Completed stage"
                    : activeStageIndex === stageIndex
                      ? "Current stage"
                      : "Upcoming stage"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-500">
                  Step {activeStageIndex + 1} of {stages.length}
                </div>
                <div className="min-w-[160px]">
                  <div className="mb-1 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <span>Completion</span>
                    <span>{stageCompletion.completed}/{stageCompletion.total}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-200">
                    <div className="h-2 rounded-full bg-brand-600" style={{ width: `${stageCompletion.percent}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
              <div>
                {stageCards[activeStageTab]}
              </div>
              <div className="space-y-4">
                <Card className="border-slate-200/80 bg-slate-50/60 p-6">
                  <p className="text-sm font-semibold text-brand-600">Decision guide</p>
                  <h4 className="mt-2 text-xl font-semibold text-slate-900">{decisionGuide.title}</h4>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{decisionGuide.decision}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Badge tone={decisionGuide.readiness === "Ready" ? "stable" : decisionGuide.readiness === "Needs review" ? "watch" : "critical"}>
                      {decisionGuide.readiness}
                    </Badge>
                    <Badge tone={decisionGuide.openDecisionCount > 0 ? "Amber" : "default"}>
                      {decisionGuide.openDecisionCount} open decision{decisionGuide.openDecisionCount === 1 ? "" : "s"}
                    </Badge>
                  </div>
                </Card>

                <Card className="border-slate-200/80 p-6">
                  <p className="text-sm font-semibold text-slate-900">Readiness check</p>
                  {decisionGuide.missing.length === 0 ? (
                    <p className="mt-3 text-sm leading-6 text-emerald-700">The key inputs for this stage are in place.</p>
                  ) : (
                    <div className="mt-3">
                      <p className="text-sm leading-6 text-slate-600">Complete these before advancing:</p>
                      <ul className="mt-3 space-y-2 text-sm text-slate-700">
                        {decisionGuide.missing.map((item) => (
                          <li key={item} className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </Card>

                <Card className="border-slate-200/80 p-6">
                  <p className="text-sm font-semibold text-slate-900">Recommended action</p>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {activeStageTab === project.stage && upcoming
                      ? `If this stage is complete, advance the project to ${upcoming}.`
                      : activeStageIndex < stageIndex
                        ? "This stage is already complete. Review it only if context needs to be revisited."
                        : "Use this stage to prepare the next workflow step and confirm the required inputs."}
                  </p>
                </Card>

              </div>
            </div>

            <div className="mt-6 grid items-start gap-4 lg:grid-cols-3">
              <TasksCard project={project} onAddTask={onAddTask} onToggleTask={onToggleTask} onRemoveTask={onRemoveTask} />

              <DocumentsCard project={project} onAddDocuments={onAddDocuments} onRemoveDocument={onRemoveDocument} />

              <Card className="border-slate-200/80 p-5">
                <p className="flex items-center gap-2 text-sm font-semibold text-slate-900"><RefreshCw size={15} className="text-brand-600" /> Activity</p>
                <div className="mt-3 space-y-2">
                  {(project.activity || []).length === 0 ? (
                    <p className="text-sm leading-6 text-slate-500">No activity recorded yet.</p>
                  ) : (
                    project.activity.slice(0, 6).map((entry) => (
                      <div key={entry.id} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                        <p className="text-sm font-medium text-slate-800">{entry.text}</p>
                        <p className="mt-1 text-xs text-slate-500">{new Date(entry.at).toLocaleString()}</p>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </div>
          </div>
        </Card>
        </div>
      </div>
      <div className="sticky bottom-0 border-t border-slate-200 bg-white/98 px-8 py-4 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1600px] flex-wrap items-center justify-between gap-3">
        <Button variant="danger" className="rounded-full px-5" onClick={() => onDelete(project.id)}>Delete</Button>
        <div className="flex flex-wrap gap-2">
          {activeStageIndex > 0 && (
            <Button variant="secondary" className="rounded-full px-5" onClick={() => setActiveStageTab(stages[activeStageIndex - 1])}>
              Previous
            </Button>
          )}
          {activeStageIndex < stages.length - 1 && (
            <Button variant="secondary" className="rounded-full px-5" onClick={() => setActiveStageTab(stages[activeStageIndex + 1])}>
              Next
              <ChevronRight size={16} />
            </Button>
          )}
          {activeStageTab === project.stage && upcoming && (
            <Button className="rounded-full px-5" onClick={() => onAdvanceStage(project.id)}>
              Advance to {upcoming}
            </Button>
          )}
          <Button variant="secondary" className="rounded-full px-5" onClick={() => onEdit(project)}>Edit</Button>
          <Button variant="secondary" className="rounded-full px-5" onClick={onClose}>Close</Button>
        </div>
        </div>
      </div>
    </Modal>
  );
}

function DecisionsView({ decisions, onAdd, onEdit, onDelete }) {
  const sorted = decisions.slice().sort((a, b) => (daysUntil(a.due) ?? 999) - (daysUntil(b.due) ?? 999));
  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Decisions</h3>
            <p className="text-sm text-slate-500">Approvals, escalations, and next-step decisions.</p>
          </div>
          <Button onClick={onAdd}><Plus size={16} /> New decision</Button>
        </div>
      </Card>

      {sorted.length === 0 ? (
        <EmptyState title="No decisions yet" text="Create a decision when a project needs approval, alignment, or a next step." action={<Button onClick={onAdd}><Plus size={16} /> New decision</Button>} />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3">Project</th>
                  <th className="px-5 py-3">Decision</th>
                  <th className="px-5 py-3">Owner</th>
                  <th className="px-5 py-3">Due</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Recommendation</th>
                  <th className="px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sorted.map((decision) => (
                  <tr key={decision.id} className="hover:bg-brand-50/30">
                    <td className="px-5 py-4 font-medium text-slate-900">{decision.project}</td>
                    <td className="px-5 py-4 text-slate-700">{decision.decision}</td>
                    <td className="px-5 py-4 text-slate-700">{decision.owner || "—"}</td>
                    <td className="px-5 py-4">
                      <div className="text-slate-700">{decision.due || "—"}</div>
                      <div className="mt-1 text-xs text-slate-500">{formatRelative(decision.due)}</div>
                    </td>
                    <td className="px-5 py-4"><Badge tone={decision.status === "Blocked" ? "Red" : decision.status === "Closed" ? "Completed" : "Amber"}>{decision.status}</Badge></td>
                    <td className="px-5 py-4 text-slate-700">{decision.recommendation}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <Button variant="secondary" className="px-3 py-2 text-xs" onClick={() => onEdit(decision)}>Edit</Button>
                        <Button variant="danger" className="px-3 py-2 text-xs" onClick={() => onDelete(decision.id)}>Delete</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

function AgentView({ messages, draft, onDraftChange, onSubmit, onRunSuggestion }) {
  const suggestions = [
    "Summarize portfolio",
    "At-risk projects",
    "PoC status",
    "Open Warehouse Safety",
    "Add task to Network Optimization: Review benchmark results",
    "Set Cargo Insurance status to Red",
  ];

  return (
    <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
      <Card className="p-6">
        <p className="text-sm font-semibold text-brand-600">Quick chat</p>
        <h3 className="mt-1 text-xl font-semibold text-slate-900">AI workspace</h3>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Ask about projects or update them directly from chat.
        </p>
        <div className="mt-5 space-y-3">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => onRunSuggestion(suggestion)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:border-brand-200 hover:bg-brand-50/60"
            >
              {suggestion}
            </button>
          ))}
        </div>
        <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
          <p className="font-semibold text-slate-800">Try asking</p>
          <ul className="mt-3 space-y-2">
            <li>Open a project</li>
            <li>Change status or owner</li>
            <li>Update target date or milestone</li>
            <li>Advance a project</li>
          </ul>
        </div>
      </Card>

      <Card className="flex min-h-[700px] flex-col overflow-hidden">
        <div className="border-b border-slate-200 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-brand-50 p-3 text-brand-600">
              <Bot size={20} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Quick chat</h3>
              <p className="text-sm text-slate-500">Live access to projects and decisions.</p>
            </div>
          </div>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto bg-[#fbfcfe] px-6 py-6">
          {messages.map((message) => (
            <div key={message.id} className={cx("max-w-[80%] rounded-3xl px-4 py-3", message.role === "user" ? "ml-auto bg-brand-600 text-white" : "bg-white text-slate-800 border border-slate-200")}>
              <p className="whitespace-pre-wrap text-sm leading-6">{message.text}</p>
            </div>
          ))}
        </div>
        <form onSubmit={onSubmit} className="border-t border-slate-200 bg-white p-4">
          <div className="flex items-end gap-3">
            <Textarea
              value={draft}
              onChange={(event) => onDraftChange(event.target.value)}
              className="min-h-[88px]"
              placeholder="Ask or update. Example: Set Warehouse Safety status to Green."
            />
            <Button type="submit" className="px-5">Run</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

function SettingsView({ projects, decisions, lastSavedAt, isRemote, accountName, onImport, onExportJson, onExportCsv, onReset, onTestConnection }) {
  const fileRef = useRef(null);
  const [diagnostic, setDiagnostic] = useState({ status: "idle", result: null });

  const runTest = async () => {
    setDiagnostic({ status: "running", result: null });
    try {
      const result = await onTestConnection();
      setDiagnostic({ status: "done", result });
    } catch (error) {
      setDiagnostic({
        status: "done",
        result: { ok: false, steps: [{ label: "Connection test failed", ok: false, detail: error instanceof Error ? error.message : String(error) }] },
      });
    }
  };

  return (
    <div className="space-y-5">
      {isRemote && (
        <Card className="p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Backend connection</h3>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                Verify the app can reach the SharePoint site and both lists. Run this after IT finishes the Entra and SharePoint setup.
              </p>
            </div>
            <Button variant="secondary" onClick={runTest} disabled={diagnostic.status === "running"}>
              <RefreshCw size={16} className={diagnostic.status === "running" ? "animate-spin" : ""} />
              {diagnostic.status === "running" ? "Testing…" : "Test connection"}
            </Button>
          </div>
          {diagnostic.result && (
            <div className="mt-4 space-y-2">
              <div className={cx("rounded-xl px-4 py-2.5 text-sm font-semibold", diagnostic.result.ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700")}>
                {diagnostic.result.ok ? "All checks passed — the shared backend is wired correctly." : "Some checks failed — see details below."}
              </div>
              {diagnostic.result.steps.map((step, index) => (
                <div key={index} className="flex items-start gap-2.5 rounded-xl border border-slate-200 px-3 py-2.5">
                  {step.ok
                    ? <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-500" />
                    : <AlertTriangle size={16} className="mt-0.5 shrink-0 text-rose-500" />}
                  <div className="min-w-0">
                    <p className={cx("text-sm font-medium", step.ok ? "text-slate-800" : "text-rose-700")}>{step.label}</p>
                    {step.detail && <p className="mt-0.5 break-words text-xs text-slate-500">{step.detail}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-slate-900">Workspace data</h3>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          {isRemote
            ? "This workspace is stored in SharePoint and shared across the team. Export a snapshot anytime; bulk import and reset are disabled here to protect shared data."
            : "Export the current workspace as JSON or CSV, or import a previous dataset."}
        </p>
        <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
          <p className="font-medium text-slate-800">
            Storage: {isRemote ? "SharePoint (shared)" : "This browser (local)"}
          </p>
          {isRemote && accountName && <p className="mt-1">Signed in as {accountName}</p>}
          <p className="mt-1">{projects.length} projects · {decisions.length} decisions</p>
          <p className="mt-1">Last save: {lastSavedAt ? new Date(lastSavedAt).toLocaleString() : "Current session"}</p>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button variant="secondary" onClick={onExportCsv}><Download size={16} /> Export CSV</Button>
          <Button variant="secondary" onClick={onExportJson}><Download size={16} /> Backup JSON</Button>
          {!isRemote && (
            <>
              <Button variant="secondary" onClick={() => fileRef.current?.click()}><Upload size={16} /> Import JSON</Button>
              <Button variant="danger" onClick={onReset}>Reset sample data</Button>
            </>
          )}
        </div>
        <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={onImport} />
      </Card>
    </div>
  );
}

function SignInScreen({ onSignIn }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <Card className="w-full max-w-md p-8 text-center shadow-sm">
        <p className="text-sm font-semibold text-brand-600">Innovation Brain</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">Sign in to continue</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          This workspace is shared across the team and protected by your organization account.
        </p>
        <Button className="mt-6 w-full" onClick={onSignIn}>Sign in with Microsoft</Button>
      </Card>
    </div>
  );
}

function FullScreenStatus({ title, detail, action, spinner = false, error = false }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <Card className="w-full max-w-md p-8 text-center shadow-sm">
        <div className={cx("mx-auto flex h-12 w-12 items-center justify-center rounded-2xl", error ? "bg-rose-50 text-rose-600" : "bg-brand-50 text-brand-600")}>
          {error ? <AlertTriangle size={22} /> : <RefreshCw size={22} className={spinner ? "animate-spin" : ""} />}
        </div>
        <h1 className="mt-4 text-xl font-semibold text-slate-900">{title}</h1>
        {detail && <p className="mt-2 break-words text-sm leading-6 text-slate-500">{detail}</p>}
        {action && <div className="mt-6 flex justify-center">{action}</div>}
      </Card>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState("Portfolio");
  const [projects, setProjects] = useState([]);
  const [decisions, setDecisions] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [editingProject, setEditingProject] = useState(null);
  const [editingDecision, setEditingDecision] = useState(null);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [showDecisionForm, setShowDecisionForm] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [agentDraft, setAgentDraft] = useState("");
  const [agentMessages, setAgentMessages] = useState([
    {
      id: "agent-welcome",
      role: "assistant",
      text: "Quick chat is live. Ask about a project or tell me to update one.",
    },
  ]);

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem("iph_sidebar_collapsed") === "1";
    } catch {
      return false;
    }
  });

  const toggleSidebar = () => {
    setSidebarCollapsed((current) => {
      const next = !current;
      try {
        localStorage.setItem("iph_sidebar_collapsed", next ? "1" : "0");
      } catch {
        // ignore storage failures
      }
      return next;
    });
  };

  useEffect(() => {
    const handler = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((current) => !current);
      }
      // Ctrl/Cmd-B toggles the sidebar — standard "full screen workspace" shortcut.
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "b") {
        event.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Backend + auth lifecycle
  const [dataStatus, setDataStatus] = useState("loading"); // loading | ready | error
  const [bootError, setBootError] = useState(null);
  const [syncError, setSyncError] = useState(null);
  const [account, setAccount] = useState(null);
  const [authChecked, setAuthChecked] = useState(!isRemoteBackend);

  // One-time, additive migration so people who already have a workspace receive
  // newly added sample initiatives without wiping their data. Bump SEED_VERSION
  // and list the new ids in NEW_SEED_IDS whenever sample projects are added.
  const SEED_VERSION = 8;
  const SEED_VERSION_KEY = "iph_seed_version";
  const NEW_SEED_IDS = [9, 10, 11, 12, 13, 14];

  const mergeNewSeedProjects = async (existing) => {
    if (isRemoteBackend) return existing; // never auto-write to the shared backend
    let storedVersion = 0;
    try {
      storedVersion = Number(localStorage.getItem(SEED_VERSION_KEY)) || 0;
    } catch {
      storedVersion = 0;
    }
    if (storedVersion >= SEED_VERSION) return existing;

    const existingIds = new Set(existing.map((item) => item.id));
    const existingNames = new Set(existing.map((item) => String(item.name || "").toLowerCase()));
    const additions = sampleProjects
      .filter((sample) => NEW_SEED_IDS.includes(sample.id))
      .map(normalizeProject)
      .filter((sample) => !existingIds.has(sample.id) && !existingNames.has(String(sample.name || "").toLowerCase()));

    for (const project of additions) {
      try {
        await repository.createProject(project);
      } catch {
        // best-effort; the in-memory list below still reflects the merge
      }
    }
    try {
      localStorage.setItem(SEED_VERSION_KEY, String(SEED_VERSION));
    } catch {
      // ignore storage failures; migration simply re-runs next load
    }
    return [...additions, ...existing];
  };

  const seedSampleData = async () => {
    const seededProjects = [];
    for (const sample of sampleProjects) {
      const normalized = normalizeProject(sample);
      try {
        seededProjects.push(await repository.createProject(normalized));
      } catch {
        seededProjects.push(normalized);
      }
    }
    const seededDecisions = [];
    for (const sample of sampleDecisions) {
      const normalized = normalizeDecision(sample);
      try {
        seededDecisions.push(await repository.createDecision(normalized));
      } catch {
        seededDecisions.push(normalized);
      }
    }
    return { projects: seededProjects, decisions: seededDecisions };
  };

  const loadWorkspace = async () => {
    setDataStatus("loading");
    setBootError(null);
    try {
      const data = await repository.load();
      let projectList = (data.projects || []).map(normalizeProject);
      let decisionList = (data.decisions || []).map(normalizeDecision);
      if (projectList.length === 0 && decisionList.length === 0) {
        const seeded = await seedSampleData();
        projectList = seeded.projects.map(normalizeProject);
        decisionList = seeded.decisions.map(normalizeDecision);
      } else {
        projectList = await mergeNewSeedProjects(projectList);
      }
      setProjects(projectList);
      setDecisions(decisionList);
      setSelectedProject(null);
      setLastSavedAt(new Date().toISOString());
      setDataStatus("ready");
    } catch (error) {
      setBootError(error instanceof Error ? error.message : String(error));
      setDataStatus("error");
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (isRemoteBackend) {
        try {
          const acc = await initAuth();
          if (cancelled) return;
          setAccount(acc);
          setAuthChecked(true);
          if (!acc) return; // render the sign-in screen
        } catch (error) {
          if (cancelled) return;
          setAuthChecked(true);
          setBootError(error instanceof Error ? error.message : String(error));
          setDataStatus("error");
          return;
        }
      }
      if (!cancelled) await loadWorkspace();
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Persistence helpers — optimistic UI updates above, durable write here.
  const reconcileRemoteId = (setter, saved) => {
    if (!saved || !saved._spItemId) return;
    setter((current) => current.map((item) => (item.id === saved.id ? { ...item, _spItemId: saved._spItemId } : item)));
  };

  const persistProject = async (record, isNew) => {
    try {
      const saved = isNew ? await repository.createProject(record) : await repository.updateProject(record);
      reconcileRemoteId(setProjects, saved);
      setSelectedProject((current) => (current && current.id === saved.id ? { ...current, _spItemId: saved._spItemId } : current));
      setLastSavedAt(new Date().toISOString());
      setSyncError(null);
    } catch (error) {
      setSyncError(`Could not save "${record.name}". ${error instanceof Error ? error.message : ""}`.trim());
    }
  };

  const persistProjectDelete = async (record) => {
    try {
      await repository.deleteProject(record);
      setLastSavedAt(new Date().toISOString());
    } catch (error) {
      setSyncError(`Could not delete "${record.name}". ${error instanceof Error ? error.message : ""}`.trim());
    }
  };

  const persistDecision = async (record, isNew) => {
    try {
      const saved = isNew ? await repository.createDecision(record) : await repository.updateDecision(record);
      reconcileRemoteId(setDecisions, saved);
      setLastSavedAt(new Date().toISOString());
      setSyncError(null);
    } catch (error) {
      setSyncError(`Could not save decision. ${error instanceof Error ? error.message : ""}`.trim());
    }
  };

  const persistDecisionDelete = async (record) => {
    try {
      await repository.deleteDecision(record);
      setLastSavedAt(new Date().toISOString());
    } catch (error) {
      setSyncError(`Could not delete decision. ${error instanceof Error ? error.message : ""}`.trim());
    }
  };

  const signOut = async () => {
    try {
      await logout();
    } catch {
      setAccount(null);
    }
  };

  const nav = [
    { label: "Portfolio", icon: LayoutDashboard, title: "Portfolio overview", desc: "Initiatives, decision flow, delivery risk, and milestone timing in one place." },
    { label: "Board", icon: Kanban, title: "Stage board", desc: "Drag projects through the workflow with stage-gate checks." },
    { label: "Projects", icon: FolderKanban, title: "Projects", desc: "Browse, filter, and advance every initiative." },
    { label: "Roadmap", icon: CalendarDays, title: "Delivery roadmap", desc: "Timeline of stages and milestones across the portfolio." },
    { label: "PoC Hub", icon: FlaskConical, title: "PoC command center", desc: "Hypotheses, success criteria, budget burn, and go/no-go signals." },
    { label: "Analytics", icon: BarChart3, title: "Portfolio analytics", desc: "Funnel, health, investment, and decision flow at a glance." },
    { label: "Decisions", icon: ClipboardCheck, title: "Decision log", desc: "Track open decisions and the owners driving alignment." },
    { label: "AI", icon: Bot, title: "AI assistant", desc: "Summaries, risks, and next actions across the portfolio." },
    { label: "Settings", icon: Settings, title: "Settings", desc: "Backup, export, and workspace configuration." },
  ];
  const activeNav = nav.find((item) => item.label === view) || nav[0];

  const appendAgentMessage = (role, text) => {
    setAgentMessages((current) => [...current, { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, role, text }]);
  };

  const patchProject = (projectId, patch, activityText) => {
    const project = projects.find((item) => item.id === projectId);
    if (!project) return null;
    const updated = {
      ...project,
      ...patch,
      updatedAt: new Date().toISOString(),
      activity: activityText ? [createActivityEntry("agent", activityText), ...(project.activity || [])].slice(0, 30) : project.activity || [],
    };
    setProjects((current) => current.map((item) => (item.id === projectId ? updated : item)));
    setSelectedProject((current) => (current && current.id === projectId ? updated : current));
    persistProject(updated, false);
    return updated;
  };

  // Task management — lightweight per-project checklists.
  const addTask = (projectId, { title, due }) => {
    const project = projects.find((item) => item.id === projectId);
    const trimmed = String(title || "").trim();
    if (!project || !trimmed) return;
    const task = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, title: trimmed, due: due || "", owner: "", done: false };
    patchProject(projectId, { tasks: [...(project.tasks || []), task] }, `Task added: ${task.title}`);
  };

  const toggleTask = (projectId, taskId) => {
    const project = projects.find((item) => item.id === projectId);
    if (!project) return;
    let toggled = null;
    const tasks = (project.tasks || []).map((task) => {
      if (task.id !== taskId) return task;
      toggled = { ...task, done: !task.done };
      return toggled;
    });
    if (!toggled) return;
    patchProject(projectId, { tasks }, `Task ${toggled.done ? "completed" : "reopened"}: ${toggled.title}`);
  };

  const removeTask = (projectId, taskId) => {
    const project = projects.find((item) => item.id === projectId);
    if (!project) return;
    const task = (project.tasks || []).find((item) => item.id === taskId);
    if (!task) return;
    patchProject(projectId, { tasks: (project.tasks || []).filter((item) => item.id !== taskId) }, `Task removed: ${task.title}`);
  };

  // Project documents — metadata lives on the project, bytes in IndexedDB.
  const addDocuments = (projectId, docs) => {
    const project = projects.find((item) => item.id === projectId);
    if (!project || !docs?.length) return;
    const label = docs.length === 1 ? `Document added: ${docs[0].name}` : `${docs.length} documents added.`;
    patchProject(projectId, { documents: [...(project.documents || []), ...docs] }, label);
  };

  const removeDocument = (projectId, docId) => {
    const project = projects.find((item) => item.id === projectId);
    if (!project) return;
    const doc = (project.documents || []).find((item) => item.id === docId);
    if (!doc) return;
    deleteDoc(docId);
    patchProject(projectId, { documents: (project.documents || []).filter((item) => item.id !== docId) }, `Document removed: ${doc.name}`);
  };

  // PoC Hub interactions.
  const togglePocCriterion = (projectId, criterionId) => {
    const project = projects.find((item) => item.id === projectId);
    if (!project) return;
    let toggled = null;
    const criteria = (project.pocSuccessCriteria || []).map((criterion) => {
      if (criterion.id !== criterionId) return criterion;
      toggled = { ...criterion, met: !criterion.met };
      return toggled;
    });
    if (!toggled) return;
    patchProject(projectId, { pocSuccessCriteria: criteria }, `PoC criterion ${toggled.met ? "met" : "reopened"}: ${toggled.text}`);
  };

  const setPocOutcome = (projectId, outcome) => {
    const project = projects.find((item) => item.id === projectId);
    if (!project || project.pocOutcome === outcome) return;
    patchProject(projectId, { pocOutcome: outcome }, `PoC outcome set to ${outcome}.`);
  };

  // Board drag-and-drop. Forward gate checks happen in BoardView before this is called.
  const moveProjectStage = (projectId, targetStage) => {
    const project = projects.find((item) => item.id === projectId);
    if (!project || project.stage === targetStage || !stages.includes(targetStage)) return;
    patchProject(projectId, { stage: targetStage }, `Stage moved from ${project.stage} to ${targetStage}.`);
  };

  const saveProject = (project) => {
    const previousName = editingProject?.name;
    const previousProject = editingProject || projects.find((item) => item.id === project.id) || null;
    const activity = [...(project.activity || previousProject?.activity || [])];

    if (!previousProject) {
      activity.unshift(createActivityEntry("create", "Project created."));
    } else {
      if (previousProject.stage !== project.stage) {
        activity.unshift(createActivityEntry("stage", `Stage changed from ${previousProject.stage} to ${project.stage}.`));
      }
      if (previousProject.status !== project.status) {
        activity.unshift(createActivityEntry("status", `Status changed from ${previousProject.status} to ${project.status}.`));
      }
      if (previousProject.recommendation !== project.recommendation) {
        activity.unshift(createActivityEntry("recommendation", `Recommendation changed to ${project.recommendation}.`));
      }
      if ((previousProject.selectedVendor || "") !== (project.selectedVendor || "")) {
        activity.unshift(createActivityEntry("vendor", project.selectedVendor ? `Selected vendor set to ${project.selectedVendor}.` : "Selected vendor cleared."));
      }
      if (previousProject.name !== project.name) {
        activity.unshift(createActivityEntry("rename", `Project renamed from ${previousProject.name} to ${project.name}.`));
      }
      activity.unshift(createActivityEntry("save", "Project details updated."));
    }

    const nextProject = {
      ...project,
      activity: activity.slice(0, 30),
    };

    setProjects((current) => {
      const exists = current.some((item) => item.id === nextProject.id);
      return exists ? current.map((item) => (item.id === nextProject.id ? nextProject : item)) : [nextProject, ...current];
    });
    if (previousName && previousName !== nextProject.name) {
      const renamed = decisions
        .filter((decision) => decision.project === previousName)
        .map((decision) => ({ ...decision, project: nextProject.name, updatedAt: new Date().toISOString() }));
      setDecisions((current) => current.map((decision) => decision.project === previousName ? { ...decision, project: nextProject.name, updatedAt: new Date().toISOString() } : decision));
      renamed.forEach((decision) => persistDecision(decision, false));
    }
    setShowProjectForm(false);
    setEditingProject(null);
    setSelectedProject(nextProject);
    persistProject(nextProject, !previousProject);
  };

  const saveDecision = (decision) => {
    const exists = decisions.some((item) => item.id === decision.id);
    setDecisions((current) =>
      exists ? current.map((item) => (item.id === decision.id ? decision : item)) : [decision, ...current]
    );
    setShowDecisionForm(false);
    setEditingDecision(null);
    persistDecision(decision, !exists);
  };

  const deleteDecision = (decisionId) => {
    const decision = decisions.find((item) => item.id === decisionId);
    if (!decision) return;
    setDecisions((current) => current.filter((item) => item.id !== decisionId));
    persistDecisionDelete(decision);
  };

  const updateProjectStatus = (projectId, status) => {
    const project = projects.find((item) => item.id === projectId);
    if (!project || project.status === status) return;
    const updated = {
      ...project,
      status,
      updatedAt: new Date().toISOString(),
      activity: [createActivityEntry("status", `Status changed from ${project.status} to ${status}.`), ...(project.activity || [])].slice(0, 30),
    };
    setProjects((current) => current.map((item) => (item.id === projectId ? updated : item)));
    setSelectedProject((current) => (current && current.id === projectId ? updated : current));
    persistProject(updated, false);
  };

  const advanceProjectStage = (projectId) => {
    const project = projects.find((item) => item.id === projectId);
    if (!project) return;

    const missing = getStageRequirements(project.stage)
      .filter(([key]) => !hasValue(project[key]))
      .map(([, label]) => label);

    if (missing.length) {
      window.alert(`Cannot advance ${project.name} yet.\n\nComplete these first:\n- ${missing.join("\n- ")}`);
      return;
    }

    const next = nextStage(project.stage);
    if (!next) return;

    const updated = {
      ...project,
      stage: next,
      updatedAt: new Date().toISOString(),
      activity: [createActivityEntry("stage", `Advanced from ${project.stage} to ${next}.`), ...(project.activity || [])].slice(0, 30),
    };
    setProjects((current) => current.map((item) => (item.id === projectId ? updated : item)));
    setSelectedProject((current) => (current && current.id === projectId ? updated : current));
    persistProject(updated, false);
  };

  const deleteProject = (projectId) => {
    const project = projects.find((item) => item.id === projectId);
    if (!project) return;
    const relatedDecisions = decisions.filter((decision) => decision.project === project.name);
    setProjects((current) => current.filter((item) => item.id !== projectId));
    setDecisions((current) => current.filter((decision) => decision.project !== project.name));
    setSelectedProject(null);
    persistProjectDelete(project);
    relatedDecisions.forEach((decision) => persistDecisionDelete(decision));
  };

  const exportWorkspaceJson = () => {
    saveJson("innovation-portfolio-backup.json", {
      exportedAt: new Date().toISOString(),
      projects,
      decisions,
    });
  };

  const importWorkspaceJson = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const next = hydrateImportedState(parsed);
      if (repository.replaceAll) await repository.replaceAll(next);
      setProjects(next.projects);
      setDecisions(next.decisions);
      setSelectedProject(null);
      setShowProjectForm(false);
      setShowDecisionForm(false);
      setLastSavedAt(new Date().toISOString());
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Unable to import JSON.");
    } finally {
      event.target.value = "";
    }
  };

  const reset = async () => {
    const seedProjects = sampleProjects.map(normalizeProject);
    const seedDecisions = sampleDecisions.map(normalizeDecision);
    if (repository.replaceAll) await repository.replaceAll({ projects: seedProjects, decisions: seedDecisions });
    setProjects(seedProjects);
    setDecisions(seedDecisions);
    setSelectedProject(null);
    setLastSavedAt(new Date().toISOString());
  };

  const runAgent = (prompt) => {
    const input = prompt.trim();
    if (!input) return;

    appendAgentMessage("user", input);

    const normalized = input.toLowerCase();
    const overdueProjects = projects.filter((project) => {
      const days = daysUntil(project.targetDate);
      return days !== null && days < 0;
    });
    const atRiskProjects = projects.filter((project) => ["Red", "Blocked"].includes(project.status));

    if (/^(summarize|summary|portfolio summary|summarize the portfolio)/.test(normalized)) {
      const topUrgent = projects
        .map((project) => ({ ...project, health: getProjectHealth(project), due: daysUntil(project.targetDate) ?? 999 }))
        .sort((a, b) => {
          const order = { critical: 0, watch: 1, stable: 2 };
          const byHealth = (order[a.health] ?? 9) - (order[b.health] ?? 9);
          if (byHealth !== 0) return byHealth;
          return a.due - b.due;
        })
        .slice(0, 3);
      appendAgentMessage(
        "assistant",
        `Portfolio summary\n\nProjects: ${projects.length}\nOpen decisions: ${decisions.filter((decision) => decision.status !== "Closed").length}\nAt risk: ${atRiskProjects.length}\nOverdue: ${overdueProjects.length}\n\nTop priorities:\n${topUrgent.map((project) => `- ${project.name} · ${project.stage} · ${project.status} · ${formatRelative(project.targetDate)}`).join("\n") || "- None"}`
      );
      return;
    }

    if (/at risk|risk projects|blocked projects|red projects/.test(normalized)) {
      appendAgentMessage(
        "assistant",
        atRiskProjects.length
          ? `At-risk projects\n\n${atRiskProjects.map((project) => `- ${project.name} · ${project.status} · ${project.stage} · ${project.nextMilestone || "No next milestone"}`).join("\n")}`
          : "There are no red or blocked projects right now."
      );
      return;
    }

    const openMatch = input.match(/(?:open|show|find)\s+(.+)/i);
    if (openMatch && !/status to|priority to|owner to|target date to|recommendation to|next milestone to/i.test(normalized)) {
      const project = findProjectByName(projects, openMatch[1]);
      if (!project) {
        appendAgentMessage("assistant", `I could not find a project matching "${openMatch[1]}".`);
        return;
      }
      setSelectedProject(project);
      appendAgentMessage("assistant", `Opened ${project.name}.\n\nStage: ${project.stage}\nStatus: ${project.status}\nOwner: ${project.owner}\nNext milestone: ${project.nextMilestone || "Not set"}`);
      return;
    }

    const advanceMatch = input.match(/(?:advance|move forward)\s+(.+)/i);
    if (advanceMatch) {
      const project = findProjectByName(projects, advanceMatch[1]);
      if (!project) {
        appendAgentMessage("assistant", `I could not find a project matching "${advanceMatch[1]}".`);
        return;
      }
      const missing = getStageRequirements(project.stage)
        .filter(([key]) => !hasValue(project[key]))
        .map(([, label]) => label);
      const next = nextStage(project.stage);
      if (!next) {
        appendAgentMessage("assistant", `${project.name} is already at the final stage.`);
        return;
      }
      if (missing.length) {
        appendAgentMessage("assistant", `I did not advance ${project.name}.\n\nComplete these first:\n- ${missing.join("\n- ")}`);
        return;
      }
      const updated = patchProject(project.id, { stage: next }, `Advanced from ${project.stage} to ${next} via workspace AI.`);
      setSelectedProject(updated || project);
      appendAgentMessage("assistant", `${project.name} advanced to ${next}.`);
      return;
    }

    const taskMatch = input.match(/^add (?:a )?task (?:to|for|on)\s+(.+?)\s*[:\-–]\s*(.+)$/i);
    if (taskMatch) {
      const project = findProjectByName(projects, taskMatch[1]);
      if (!project) {
        appendAgentMessage("assistant", `I could not find a project matching "${taskMatch[1]}".`);
        return;
      }
      addTask(project.id, { title: taskMatch[2] });
      appendAgentMessage("assistant", `Added task to ${project.name}: "${taskMatch[2].trim()}".`);
      return;
    }

    if (/poc status|poc summary|active pocs|running pocs/.test(normalized)) {
      const activePocs = projects.filter((project) => project.stage === "POC");
      if (!activePocs.length) {
        appendAgentMessage("assistant", "There are no active PoCs right now. Check the PoC Hub for pipeline candidates.");
        return;
      }
      appendAgentMessage(
        "assistant",
        `Active PoCs\n\n${activePocs.map((project) => {
          const progress = getPocCriteriaProgress(project);
          const daysLeft = daysUntil(project.pocEndDate);
          return `- ${project.name} · ${progress.met}/${progress.total} criteria met · ${daysLeft === null ? "no end date" : daysLeft < 0 ? `${Math.abs(daysLeft)}d over` : `${daysLeft}d left`} · outcome ${project.pocOutcome || "Pending"}`;
        }).join("\n")}`
      );
      return;
    }

    const projectPrefix = input.match(/^(?:set|update|change)\s+(.+?)\s+(status|priority|owner|target date|recommendation|next milestone)\s+to\s+(.+)$/i);
    if (projectPrefix) {
      const [, rawProjectName, rawField, rawValue] = projectPrefix;
      const project = findProjectByName(projects, rawProjectName);
      if (!project) {
        appendAgentMessage("assistant", `I could not find a project matching "${rawProjectName}".`);
        return;
      }

      const field = rawField.toLowerCase();
      const value = rawValue.trim();
      const patch = {};
      let activityText = "";

      if (field === "status") {
        const valid = statuses.find((item) => item.toLowerCase() === value.toLowerCase());
        if (!valid) {
          appendAgentMessage("assistant", `Status must be one of: ${statuses.join(", ")}.`);
          return;
        }
        patch.status = valid;
        activityText = `Status changed from ${project.status} to ${valid} via workspace AI.`;
      } else if (field === "priority") {
        const valid = priorities.find((item) => item.toLowerCase() === value.toLowerCase());
        if (!valid) {
          appendAgentMessage("assistant", `Priority must be one of: ${priorities.join(", ")}.`);
          return;
        }
        patch.priority = valid;
        activityText = `Priority changed from ${project.priority} to ${valid} via workspace AI.`;
      } else if (field === "owner") {
        patch.owner = value;
        activityText = `Owner changed from ${project.owner || "Unassigned"} to ${value} via workspace AI.`;
      } else if (field === "target date") {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
          appendAgentMessage("assistant", "Target date must use YYYY-MM-DD format.");
          return;
        }
        patch.targetDate = value;
        activityText = `Target date changed to ${value} via workspace AI.`;
      } else if (field === "recommendation") {
        const valid = recommendations.find((item) => item.toLowerCase() === value.toLowerCase());
        if (!valid) {
          appendAgentMessage("assistant", `Recommendation must be one of: ${recommendations.join(", ")}.`);
          return;
        }
        patch.recommendation = valid;
        activityText = `Recommendation changed to ${valid} via workspace AI.`;
      } else if (field === "next milestone") {
        patch.nextMilestone = value;
        activityText = `Next milestone updated to "${value}" via workspace AI.`;
      }

      const updated = patchProject(project.id, patch, activityText);
      if (selectedProject?.id === project.id) setSelectedProject(updated || project);
      appendAgentMessage("assistant", `Updated ${project.name}: ${rawField} set to ${value}.`);
      return;
    }

    const statusQuery = input.match(/(?:status of|tell me about|summary of)\s+(.+)/i);
    if (statusQuery) {
      const project = findProjectByName(projects, statusQuery[1]);
      if (!project) {
        appendAgentMessage("assistant", `I could not find a project matching "${statusQuery[1]}".`);
        return;
      }
      const leaderboard = getVendorLeaderboard(project);
      const topVendor = leaderboard[0];
      appendAgentMessage(
        "assistant",
        `${project.name}\n\nStage: ${project.stage}\nStatus: ${project.status}\nPriority: ${project.priority}\nOwner: ${project.owner}\nTarget date: ${project.targetDate || "Not set"} (${formatRelative(project.targetDate)})\nNext milestone: ${project.nextMilestone || "Not set"}\nRecommendation: ${project.recommendation}\nTop vendor: ${topVendor ? `${topVendor.vendorName} (${topVendor.score}/5)` : "No vendor scoring yet"}`
      );
      return;
    }

    appendAgentMessage(
      "assistant",
      "I can summarize the portfolio, show at-risk work or active PoCs, open a project, advance a project, add tasks (\"Add task to <project>: <task>\"), or update fields like status, priority, owner, target date, recommendation, and next milestone."
    );
  };

  const submitAgentPrompt = (event) => {
    event.preventDefault();
    const prompt = agentDraft;
    setAgentDraft("");
    runAgent(prompt);
  };

  if (isRemoteBackend && authChecked && !account) {
    return <SignInScreen onSignIn={login} />;
  }

  if ((isRemoteBackend && !authChecked) || dataStatus === "loading") {
    return (
      <FullScreenStatus
        title="Loading workspace…"
        detail={isRemoteBackend ? "Connecting to SharePoint" : "Preparing your data"}
        spinner
      />
    );
  }

  if (dataStatus === "error") {
    return (
      <FullScreenStatus
        title="Could not load the workspace"
        detail={bootError}
        error
        action={
          <div className="flex gap-2">
            <Button onClick={loadWorkspace}>Retry</Button>
            {isRemoteBackend && <Button variant="secondary" onClick={signOut}>Sign out</Button>}
          </div>
        }
      />
    );
  }

  return (
    <div className="min-h-screen text-slate-900">
      <aside className={cx("fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-sidebar-gradient text-white transition-transform duration-300 ease-in-out lg:flex", sidebarCollapsed && "lg:-translate-x-full")}>
        <div className="flex items-center gap-3 px-5 pb-5 pt-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15 backdrop-blur">
            <Brain size={20} className="text-white" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-bold tracking-tight">Innovation Brain</p>
            <p className="whitespace-nowrap text-[9px] font-medium uppercase tracking-[0.12em] text-brand-200/70">by Maersk Innovation Team</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-2">
          {nav.map(({ label, icon: Icon }) => {
            const active = view === label;
            return (
              <button
                key={label}
                onClick={() => setView(label)}
                className={cx(
                  "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all",
                  active ? "bg-white/[0.12] text-white ring-1 ring-white/10" : "text-brand-100/70 hover:bg-white/5 hover:text-white"
                )}
              >
                <span className={cx("flex h-7 w-7 items-center justify-center rounded-lg transition", active ? "bg-white/15 text-white" : "text-brand-200/70 group-hover:text-white")}>
                  <Icon size={17} />
                </span>
                {label}
                {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-brand-300" />}
              </button>
            );
          })}
        </nav>
        <div className="mt-auto px-3 pb-5">
          <div className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-gradient text-sm font-bold text-white ring-2 ring-white/15">
                {(account?.name || account?.username || "IH").slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{account?.name || account?.username || "Local workspace"}</p>
                <p className="truncate text-[11px] text-brand-200/70">{isRemoteBackend ? "SharePoint backend" : "This browser only"}</p>
              </div>
              {isRemoteBackend && account && (
                <button type="button" onClick={signOut} title="Sign out" className="rounded-lg p-1.5 text-brand-200/70 transition hover:bg-white/10 hover:text-white">
                  <LogOut size={16} />
                </button>
              )}
            </div>
          </div>
        </div>
      </aside>

      <div className={cx("transition-[padding] duration-300 ease-in-out", sidebarCollapsed ? "lg:pl-0" : "lg:pl-64")}>
        <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/75 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3 px-4 py-3.5 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={toggleSidebar}
                title={sidebarCollapsed ? "Show sidebar (⌘B)" : "Hide sidebar (⌘B)"}
                className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-card transition hover:border-slate-300 hover:text-slate-900 lg:inline-flex"
              >
                {sidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
              </button>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-brand-sm lg:hidden">
                <Brain size={18} />
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-lg font-bold tracking-tight text-slate-900 lg:text-xl">{activeNav.title}</h1>
                <p className="hidden truncate text-sm text-slate-500 sm:block">{activeNav.desc}</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setPaletteOpen(true)}
                className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500 shadow-card transition hover:border-slate-300 hover:text-slate-700 md:inline-flex"
              >
                <Search size={14} /> Search…
                <kbd className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">⌘K</kbd>
              </button>
              <Button onClick={() => { setEditingProject(null); setShowProjectForm(true); }}>
                <Plus size={16} /> <span className="hidden sm:inline">New project</span>
              </Button>
            </div>
          </div>
          <nav className="flex gap-1.5 overflow-x-auto px-4 pb-3 lg:hidden">
            {nav.map(({ label, icon: Icon }) => (
              <button key={label} onClick={() => setView(label)} className={cx("inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition", view === label ? "bg-brand-600 text-white shadow-brand-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}>
                <Icon size={15} /> {label}
              </button>
            ))}
          </nav>
        </header>

        <main className="px-4 py-6 lg:px-8">
          {syncError && (
            <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-2">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                <span>{syncError}</span>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" className="px-3 py-2 text-xs" onClick={loadWorkspace}>Reload from server</Button>
                <Button variant="secondary" className="px-3 py-2 text-xs" onClick={() => setSyncError(null)}>Dismiss</Button>
              </div>
            </div>
          )}
          <div key={view} className="animate-fade-in">

        {view === "Portfolio" && (
          <Overview projects={projects} decisions={decisions} onOpenProject={setSelectedProject} onSetView={setView} />
        )}

        {view === "Board" && (
          <BoardView
            projects={projects}
            onOpenProject={setSelectedProject}
            onNewProject={() => { setEditingProject(null); setShowProjectForm(true); }}
            onMoveStage={moveProjectStage}
          />
        )}

        {view === "Roadmap" && (
          <RoadmapView
            projects={projects}
            onOpenProject={setSelectedProject}
            onNewProject={() => { setEditingProject(null); setShowProjectForm(true); }}
          />
        )}

        {view === "PoC Hub" && (
          <PocView
            projects={projects}
            onOpenProject={setSelectedProject}
            onToggleCriterion={togglePocCriterion}
            onSetOutcome={setPocOutcome}
            onMoveStage={moveProjectStage}
          />
        )}

        {view === "Analytics" && (
          <AnalyticsView projects={projects} decisions={decisions} />
        )}

        {view === "Projects" && (
          <ProjectsView
            projects={projects}
            onOpenProject={setSelectedProject}
            onNewProject={() => { setEditingProject(null); setShowProjectForm(true); }}
            onAdvanceStage={advanceProjectStage}
            onStatusChange={updateProjectStatus}
          />
        )}

        {view === "AI" && (
          <AgentView
            messages={agentMessages}
            draft={agentDraft}
            onDraftChange={setAgentDraft}
            onSubmit={submitAgentPrompt}
            onRunSuggestion={runAgent}
          />
        )}

        {view === "Decisions" && (
          <DecisionsView
            decisions={decisions}
            onAdd={() => { setEditingDecision(null); setShowDecisionForm(true); }}
            onEdit={(decision) => { setEditingDecision(decision); setShowDecisionForm(true); }}
            onDelete={deleteDecision}
          />
        )}

        {view === "Settings" && (
          <SettingsView
            projects={projects}
            decisions={decisions}
            lastSavedAt={lastSavedAt}
            isRemote={isRemoteBackend}
            accountName={account?.username || account?.name}
            onImport={importWorkspaceJson}
            onExportJson={exportWorkspaceJson}
            onExportCsv={() => saveCsv("innovation-projects.csv", projects)}
            onReset={reset}
            onTestConnection={() => repository.diagnose?.() ?? Promise.resolve({ ok: false, steps: [{ label: "Diagnostics unavailable on this backend", ok: false }] })}
          />
        )}
          </div>
        </main>
      </div>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        projects={projects}
        navItems={nav}
        onOpenProject={setSelectedProject}
        onSetView={setView}
        onNewProject={() => { setEditingProject(null); setShowProjectForm(true); }}
      />

      {selectedProject && (
        <ProjectDetail
          project={selectedProject}
          decisions={decisions}
          onClose={() => setSelectedProject(null)}
          onEdit={(project) => { setEditingProject(project); setShowProjectForm(true); }}
          onDelete={deleteProject}
          onAdvanceStage={advanceProjectStage}
          onAddTask={addTask}
          onToggleTask={toggleTask}
          onRemoveTask={removeTask}
          onAddDocuments={addDocuments}
          onRemoveDocument={removeDocument}
        />
      )}

      {showProjectForm && (
        <ProjectForm
          project={editingProject}
          onSave={saveProject}
          onClose={() => { setShowProjectForm(false); setEditingProject(null); }}
        />
      )}

      {showDecisionForm && (
        <DecisionForm
          decision={editingDecision}
          projects={projects}
          onSave={saveDecision}
          onClose={() => { setShowDecisionForm(false); setEditingDecision(null); }}
        />
      )}
    </div>
  );
}
