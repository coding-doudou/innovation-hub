import React, { useMemo, useState } from "react";
import { AlertTriangle, GripVertical, ListChecks, Plus, Search } from "lucide-react";
import { stages, statuses, STATUS_BAR } from "../lib/constants.js";
import {
  cx,
  daysUntil,
  formatRelative,
  getProjectHealth,
  getStageCompletion,
  getStageRequirements,
  getTaskProgress,
  hasValue,
} from "../lib/utils.js";
import { Badge, Button, Card, EmptyState, Input } from "../components/ui.jsx";

function BoardCard({ project, onOpenProject, onDragStart, onDragEnd, isDragging }) {
  const palette = STATUS_BAR[project.status] || STATUS_BAR.Green;
  const health = getProjectHealth(project);
  const days = daysUntil(project.targetDate);
  const isOverdue = days !== null && days < 0 && project.status !== "Completed";
  const tasks = getTaskProgress(project);
  const completion = getStageCompletion(project, project.stage);

  return (
    <div
      draggable
      onDragStart={(event) => onDragStart(event, project)}
      onDragEnd={onDragEnd}
      onClick={() => onOpenProject(project)}
      className={cx(
        "group cursor-grab rounded-2xl border border-slate-200 bg-white p-4 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-card-hover active:cursor-grabbing",
        isDragging && "opacity-40 ring-2 ring-brand-300"
      )}
    >
      <div className="flex items-start gap-2">
        <span className={cx("mt-1 h-2.5 w-2.5 shrink-0 rounded-full", palette.bar)} />
        <p className="min-w-0 flex-1 text-sm font-semibold leading-5 text-slate-900">{project.name}</p>
        <GripVertical size={14} className="mt-0.5 shrink-0 text-slate-300 opacity-0 transition group-hover:opacity-100" />
      </div>
      <p className="mt-1.5 truncate pl-[18px] text-xs text-slate-500">{project.owner || "Unassigned"} · {project.productArea}</p>
      <div className="mt-3 flex flex-wrap items-center gap-1.5 pl-[18px]">
        <Badge tone={project.priority}>{project.priority}</Badge>
        {isOverdue ? (
          <Badge tone="critical">{formatRelative(project.targetDate)}</Badge>
        ) : project.targetDate ? (
          <Badge tone={health === "watch" ? "watch" : "default"}>{formatRelative(project.targetDate)}</Badge>
        ) : null}
      </div>
      <div className="mt-3 space-y-2 pl-[18px]">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="w-14 shrink-0">Gate</span>
          <div className="h-1.5 flex-1 rounded-full bg-slate-100">
            <div className="h-1.5 rounded-full bg-brand-500" style={{ width: `${completion.percent}%` }} />
          </div>
          <span className="w-8 text-right font-medium text-slate-600">{completion.completed}/{completion.total}</span>
        </div>
        {tasks.total > 0 && (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="flex w-14 shrink-0 items-center gap-1"><ListChecks size={12} /> Tasks</span>
            <div className="h-1.5 flex-1 rounded-full bg-slate-100">
              <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${tasks.percent}%` }} />
            </div>
            <span className="w-8 text-right font-medium text-slate-600">{tasks.done}/{tasks.total}</span>
          </div>
        )}
      </div>
      {project.nextMilestone && (
        <p className="mt-3 truncate rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs text-slate-600" title={project.nextMilestone}>
          Next: {project.nextMilestone}
        </p>
      )}
    </div>
  );
}

export default function BoardView({ projects, onOpenProject, onNewProject, onMoveStage }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [draggingId, setDraggingId] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [gateWarning, setGateWarning] = useState(null);

  const filtered = useMemo(() => {
    return projects.filter((project) => {
      const haystack = [project.name, project.owner, project.productArea].join(" ").toLowerCase();
      const matchesQuery = haystack.includes(query.toLowerCase());
      const matchesStatus = status === "All" || project.status === status;
      return matchesQuery && matchesStatus;
    });
  }, [projects, query, status]);

  const columns = useMemo(
    () =>
      stages.map((stage) => ({
        stage,
        items: filtered
          .filter((project) => project.stage === stage)
          .sort((a, b) => (daysUntil(a.targetDate) ?? 999) - (daysUntil(b.targetDate) ?? 999)),
      })),
    [filtered]
  );

  const dragging = draggingId ? projects.find((project) => project.id === draggingId) : null;

  const handleDragStart = (event, project) => {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(project.id));
    setDraggingId(project.id);
    setGateWarning(null);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDropTarget(null);
  };

  // Moving forward requires the gate checks of every stage being skipped past.
  const blockedLabels = (project, targetStage) => {
    const fromIndex = stages.indexOf(project.stage);
    const toIndex = stages.indexOf(targetStage);
    if (toIndex <= fromIndex) return [];
    const missing = [];
    for (let index = fromIndex; index < toIndex; index += 1) {
      for (const [key, label] of getStageRequirements(stages[index])) {
        if (!hasValue(project[key]) && !missing.includes(label)) missing.push(label);
      }
    }
    return missing;
  };

  const handleDrop = (event, targetStage) => {
    event.preventDefault();
    setDropTarget(null);
    const id = draggingId ?? Number(event.dataTransfer.getData("text/plain"));
    const project = projects.find((item) => item.id === id);
    setDraggingId(null);
    if (!project || project.stage === targetStage) return;

    const missing = blockedLabels(project, targetStage);
    if (missing.length) {
      setGateWarning({ name: project.name, targetStage, missing });
      return;
    }
    setGateWarning(null);
    onMoveStage(project.id, targetStage);
  };

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Stage board</h3>
            <p className="text-sm text-slate-500">Drag projects between stages. Forward moves are checked against the stage gate.</p>
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
        {gateWarning && (
          <div className="mt-4 flex items-start justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <div className="flex items-start gap-2">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <span>
                <strong>{gateWarning.name}</strong> can't move to {gateWarning.targetStage} yet. Missing: {gateWarning.missing.join(", ")}.
              </span>
            </div>
            <button type="button" onClick={() => setGateWarning(null)} className="shrink-0 font-semibold text-amber-700 hover:text-amber-900">Dismiss</button>
          </div>
        )}
      </Card>

      {filtered.length === 0 ? (
        <EmptyState title="No projects on the board" text="Adjust the filters or create a new project to populate the stages." action={<Button onClick={onNewProject}><Plus size={16} /> New project</Button>} />
      ) : (
        <div className="overflow-x-auto pb-2">
          <div className="flex min-w-max gap-4">
            {columns.map(({ stage, items }) => {
              const isTarget = dropTarget === stage;
              const wouldBlock = dragging ? blockedLabels(dragging, stage).length > 0 && stage !== dragging.stage : false;
              return (
                <div
                  key={stage}
                  onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; setDropTarget(stage); }}
                  onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setDropTarget((current) => (current === stage ? null : current)); }}
                  onDrop={(event) => handleDrop(event, stage)}
                  className={cx(
                    "flex w-[300px] shrink-0 flex-col rounded-2xl border bg-slate-50/60 transition-colors",
                    isTarget && !wouldBlock && "border-brand-400 bg-brand-50/60",
                    isTarget && wouldBlock && "border-amber-400 bg-amber-50/60",
                    !isTarget && "border-slate-200/70"
                  )}
                >
                  <div className="flex items-center justify-between gap-2 px-4 pb-2 pt-4">
                    <p className="text-sm font-semibold text-slate-800">{stage}</p>
                    <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-500 ring-1 ring-slate-200">{items.length}</span>
                  </div>
                  <div className="flex-1 space-y-3 px-3 pb-3">
                    {items.length === 0 ? (
                      <div className={cx("rounded-2xl border border-dashed px-3 py-8 text-center text-xs", isTarget ? "border-brand-300 text-brand-600" : "border-slate-200 text-slate-400")}>
                        {isTarget ? "Drop here" : "No projects"}
                      </div>
                    ) : (
                      items.map((project) => (
                        <BoardCard
                          key={project.id}
                          project={project}
                          onOpenProject={onOpenProject}
                          onDragStart={handleDragStart}
                          onDragEnd={handleDragEnd}
                          isDragging={draggingId === project.id}
                        />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
