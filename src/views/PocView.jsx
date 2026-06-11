import React, { useMemo } from "react";
import {
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  FlaskConical,
  Rocket,
  Target,
  Trophy,
} from "lucide-react";
import { stages, pocOutcomes } from "../lib/constants.js";
import {
  cx,
  daysUntil,
  formatAmount,
  formatShortDate,
  getPocCriteriaProgress,
  getPocSignal,
  getVendorLeaderboard,
  parseAmount,
} from "../lib/utils.js";
import { Badge, Button, Card, EmptyState, MetricCard } from "../components/ui.jsx";

const POST_POC_STAGES = ["Deployment Planning", "Deployment Execution", "Measuring Success"];

function BurnBar({ budget, spend }) {
  const budgetAmount = parseAmount(budget);
  const spendAmount = parseAmount(spend) ?? 0;
  if (budgetAmount === null) return <p className="text-xs text-slate-400">No budget set</p>;
  const percent = Math.min(Math.round((spendAmount / budgetAmount) * 100), 100);
  const over = spendAmount > budgetAmount;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-slate-500">Budget burn</span>
        <span className={cx("font-semibold", over ? "text-rose-600" : "text-slate-700")}>
          {formatAmount(spendAmount)} / {formatAmount(budgetAmount)}
        </span>
      </div>
      <div className="h-2 rounded-full bg-slate-100">
        <div className={cx("h-2 rounded-full", over ? "bg-rose-500" : percent > 80 ? "bg-amber-500" : "bg-brand-600")} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function PocCard({ project, onOpenProject, onToggleCriterion, onSetOutcome }) {
  const progress = getPocCriteriaProgress(project);
  const signal = getPocSignal(project);
  const daysLeft = daysUntil(project.pocEndDate);
  const vendor = project.selectedVendor || getVendorLeaderboard(project)[0]?.vendorName;

  return (
    <Card className="flex flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <button onClick={() => onOpenProject(project)} className="min-w-0 text-left">
          <p className="truncate text-base font-semibold text-slate-900 hover:text-brand-700">{project.name}</p>
          <p className="mt-0.5 truncate text-xs text-slate-500">
            {project.owner || "Unassigned"}{vendor ? ` · with ${vendor}` : ""}
          </p>
        </button>
        <Badge tone={signal.tone}>{signal.label}</Badge>
      </div>

      {project.pocHypothesis ? (
        <p className="mt-3 rounded-xl bg-brand-50/60 px-3 py-2.5 text-sm leading-5 text-slate-700">
          <span className="font-semibold text-brand-700">Hypothesis: </span>{project.pocHypothesis}
        </p>
      ) : (
        <p className="mt-3 rounded-xl border border-dashed border-amber-200 bg-amber-50/50 px-3 py-2.5 text-sm text-amber-700">
          No hypothesis defined yet — edit the project's POC stage to set the charter.
        </p>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
        <div className="rounded-xl bg-slate-50 px-3 py-2">
          <p className="flex items-center gap-1 text-slate-500"><CalendarClock size={12} /> Timeline</p>
          <p className="mt-1 font-semibold text-slate-800">
            {project.pocStartDate || project.pocEndDate
              ? `${formatShortDate(project.pocStartDate)} → ${formatShortDate(project.pocEndDate)}`
              : "Not scheduled"}
          </p>
          {daysLeft !== null && (
            <p className={cx("mt-0.5", daysLeft < 0 ? "font-semibold text-rose-600" : "text-slate-500")}>
              {daysLeft < 0 ? `${Math.abs(daysLeft)}d over` : `${daysLeft}d remaining`}
            </p>
          )}
        </div>
        <div className="rounded-xl bg-slate-50 px-3 py-2">
          <p className="flex items-center gap-1 text-slate-500"><CircleDollarSign size={12} /> Investment</p>
          <div className="mt-1.5"><BurnBar budget={project.pocBudget} spend={project.pocSpend} /></div>
        </div>
      </div>

      <div className="mt-4 flex-1">
        <div className="mb-2 flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <Target size={12} /> Success criteria
          </p>
          <span className="text-xs font-semibold text-slate-700">{progress.met}/{progress.total} met</span>
        </div>
        {progress.total === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 px-3 py-3 text-xs text-slate-400">No success criteria defined yet.</p>
        ) : (
          <ul className="space-y-1.5">
            {(project.pocSuccessCriteria || []).map((criterion) => (
              <li key={criterion.id}>
                <label className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 text-sm transition hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={Boolean(criterion.met)}
                    onChange={() => onToggleCriterion(project.id, criterion.id)}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-brand-600 accent-brand-600"
                  />
                  <span className={cx("leading-5", criterion.met ? "text-slate-400 line-through" : "text-slate-700")}>{criterion.text}</span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-4">
        <select
          value={project.pocOutcome || "Pending"}
          onChange={(event) => onSetOutcome(project.id, event.target.value)}
          className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700"
        >
          {pocOutcomes.map((outcome) => <option key={outcome} value={outcome}>Outcome: {outcome}</option>)}
        </select>
        <Button variant="secondary" className="px-3 py-2 text-xs" onClick={() => onOpenProject(project)}>Open</Button>
      </div>
    </Card>
  );
}

export default function PocView({ projects, onOpenProject, onToggleCriterion, onSetOutcome, onMoveStage }) {
  const active = useMemo(() => projects.filter((project) => project.stage === "POC"), [projects]);
  const pipeline = useMemo(
    () => projects.filter((project) => project.recommendation === "Select for PoC" && stages.indexOf(project.stage) < stages.indexOf("POC")),
    [projects]
  );
  const graduated = useMemo(
    () => projects.filter((project) => POST_POC_STAGES.includes(project.stage) && (project.pocOutcome && project.pocOutcome !== "Pending" || project.pocHypothesis)),
    [projects]
  );

  const totals = useMemo(() => {
    const tracked = [...active, ...graduated];
    let budget = 0;
    let spend = 0;
    for (const project of tracked) {
      budget += parseAmount(project.pocBudget) ?? 0;
      spend += parseAmount(project.pocSpend) ?? 0;
    }
    const criteria = active.reduce((acc, project) => {
      const progress = getPocCriteriaProgress(project);
      return { met: acc.met + progress.met, total: acc.total + progress.total };
    }, { met: 0, total: 0 });
    const successes = projects.filter((project) => project.pocOutcome === "Success").length;
    return { budget, spend, criteria, successes };
  }, [projects, active, graduated]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Active PoCs" value={active.length} helper="Currently in test" icon={FlaskConical} />
        <MetricCard title="PoC pipeline" value={pipeline.length} helper="Selected, not yet started" icon={Rocket} accent="violet" />
        <MetricCard
          title="Criteria met"
          value={totals.criteria.total ? `${totals.criteria.met}/${totals.criteria.total}` : "—"}
          helper="Across active PoCs"
          icon={CheckCircle2}
          accent="emerald"
        />
        <MetricCard
          title="PoC investment"
          value={totals.budget ? formatAmount(totals.budget) : "—"}
          helper={totals.budget ? `${formatAmount(totals.spend)} spent so far` : "No budgets tracked yet"}
          icon={CircleDollarSign}
          accent="amber"
        />
      </div>

      {active.length === 0 ? (
        <EmptyState
          title="No active PoCs"
          text="Move a project into the POC stage to start tracking its hypothesis, success criteria, budget, and go/no-go signal here."
        />
      ) : (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Active proofs of concept</h3>
          <div className="grid gap-5 lg:grid-cols-2 2xl:grid-cols-3">
            {active.map((project) => (
              <PocCard
                key={project.id}
                project={project}
                onOpenProject={onOpenProject}
                onToggleCriterion={onToggleCriterion}
                onSetOutcome={onSetOutcome}
              />
            ))}
          </div>
        </div>
      )}

      {pipeline.length > 0 && (
        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <Rocket size={16} className="text-violet-500" />
            <h3 className="text-sm font-semibold text-slate-900">PoC pipeline</h3>
            <span className="text-xs text-slate-500">Recommended for PoC, waiting to start</span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {pipeline.map((project) => (
              <div key={project.id} className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 p-3">
                <button onClick={() => onOpenProject(project)} className="min-w-0 text-left">
                  <p className="truncate text-sm font-semibold text-slate-900 hover:text-brand-700">{project.name}</p>
                  <p className="mt-0.5 truncate text-xs text-slate-500">{project.stage} · {project.owner || "Unassigned"}</p>
                </button>
                <Button variant="secondary" className="shrink-0 px-3 py-2 text-xs" onClick={() => onMoveStage(project.id, "POC")}>
                  Start PoC
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {graduated.length > 0 && (
        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <Trophy size={16} className="text-amber-500" />
            <h3 className="text-sm font-semibold text-slate-900">Past PoCs</h3>
            <span className="text-xs text-slate-500">Graduated into deployment or measurement</span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {graduated.map((project) => {
              const signal = getPocSignal(project);
              return (
                <button
                  key={project.id}
                  onClick={() => onOpenProject(project)}
                  className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 p-3 text-left transition hover:border-brand-200 hover:bg-brand-50/40"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{project.name}</p>
                    <p className="mt-0.5 truncate text-xs text-slate-500">{project.stage}{project.selectedVendor ? ` · ${project.selectedVendor}` : ""}</p>
                  </div>
                  <Badge tone={signal.tone}>{project.pocOutcome || "Pending"}</Badge>
                </button>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
