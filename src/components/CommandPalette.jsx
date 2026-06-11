import React, { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, CornerDownLeft, FolderKanban, Plus, Search, Zap } from "lucide-react";
import { cx, getProjectHealth, normalizeText } from "../lib/utils.js";
import { Badge } from "./ui.jsx";

// Global ⌘K palette: fuzzy project search plus navigation and quick actions.
export default function CommandPalette({ open, onClose, projects, navItems, onOpenProject, onSetView, onNewProject }) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const results = useMemo(() => {
    const target = normalizeText(query);
    const items = [];

    const matchedProjects = projects.filter((project) => {
      if (!target) return true;
      return normalizeText(`${project.name} ${project.owner} ${project.productArea} ${project.stage}`).includes(target);
    });
    for (const project of matchedProjects.slice(0, target ? 8 : 5)) {
      items.push({
        kind: "project",
        key: `project-${project.id}`,
        label: project.name,
        detail: `${project.stage} · ${project.owner || "Unassigned"}`,
        health: getProjectHealth(project),
        run: () => onOpenProject(project),
      });
    }

    const actions = [
      { label: "New project", detail: "Create a new initiative", icon: Plus, run: onNewProject },
      ...navItems.map((item) => ({
        label: `Go to ${item.label}`,
        detail: item.title,
        icon: ArrowRight,
        run: () => onSetView(item.label),
      })),
    ];
    for (const action of actions) {
      if (target && !normalizeText(action.label).includes(target)) continue;
      items.push({ kind: "action", key: `action-${action.label}`, ...action });
    }

    return items;
  }, [query, projects, navItems, onOpenProject, onSetView, onNewProject]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    const node = listRef.current?.children?.[activeIndex];
    node?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  if (!open) return null;

  const run = (item) => {
    onClose();
    item.run();
  };

  const handleKeyDown = (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => Math.min(current + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => Math.max(current - 1, 0));
    } else if (event.key === "Enter" && results[activeIndex]) {
      event.preventDefault();
      run(results[activeIndex]);
    } else if (event.key === "Escape") {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-ink/40 p-4 pt-[12vh] backdrop-blur-sm" onMouseDown={onClose}>
      <div
        className="w-full max-w-xl overflow-hidden rounded-3xl border border-white/60 bg-white shadow-2xl ring-1 ring-slate-900/5 animate-fade-in"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-slate-200/70 px-5 py-4">
          <Search size={18} className="shrink-0 text-slate-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search projects, jump to a view, or run an action…"
            className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 outline-none"
          />
          <kbd className="shrink-0 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">ESC</kbd>
        </div>
        <div ref={listRef} className="max-h-[50vh] overflow-y-auto p-2">
          {results.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-slate-500">No matches for "{query}".</p>
          ) : (
            results.map((item, index) => (
              <button
                key={item.key}
                onClick={() => run(item)}
                onMouseMove={() => setActiveIndex(index)}
                className={cx(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition",
                  index === activeIndex ? "bg-brand-50 text-brand-900" : "text-slate-700"
                )}
              >
                <span className={cx("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", item.kind === "project" ? "bg-brand-100 text-brand-700" : "bg-slate-100 text-slate-500")}>
                  {item.kind === "project" ? <FolderKanban size={15} /> : item.icon ? <item.icon size={15} /> : <Zap size={15} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{item.label}</span>
                  <span className="block truncate text-xs text-slate-500">{item.detail}</span>
                </span>
                {item.kind === "project" && item.health !== "stable" && (
                  <Badge tone={item.health}>{item.health === "critical" ? "Needs action" : "Watch"}</Badge>
                )}
                {index === activeIndex && <CornerDownLeft size={14} className="shrink-0 text-slate-400" />}
              </button>
            ))
          )}
        </div>
        <div className="flex items-center gap-4 border-t border-slate-200/70 bg-slate-50/60 px-5 py-2.5 text-[11px] text-slate-500">
          <span><kbd className="font-semibold">↑↓</kbd> navigate</span>
          <span><kbd className="font-semibold">↵</kbd> select</span>
          <span><kbd className="font-semibold">esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}
