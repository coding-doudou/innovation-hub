import React from "react";
import { FolderKanban, Plus, X } from "lucide-react";
import { cx } from "../lib/utils.js";

export function Badge({ children, tone = "default" }) {
  const styles = {
    Green: "border-emerald-200/70 bg-emerald-50 text-emerald-700",
    Amber: "border-amber-200/70 bg-amber-50 text-amber-700",
    Red: "border-rose-200/70 bg-rose-50 text-rose-700",
    Blocked: "border-slate-300 bg-slate-100 text-slate-700",
    Completed: "border-sky-200/70 bg-sky-50 text-sky-700",
    Strategic: "border-brand-200/70 bg-brand-50 text-brand-700",
    High: "border-orange-200/70 bg-orange-50 text-orange-700",
    Medium: "border-sky-200/70 bg-sky-50 text-sky-700",
    Low: "border-slate-200 bg-slate-50 text-slate-600",
    critical: "border-rose-200/70 bg-rose-50 text-rose-700",
    watch: "border-amber-200/70 bg-amber-50 text-amber-700",
    stable: "border-emerald-200/70 bg-emerald-50 text-emerald-700",
    default: "border-slate-200 bg-white text-slate-600",
  };
  const dots = {
    Green: "bg-emerald-500", Amber: "bg-amber-500", Red: "bg-rose-500",
    Blocked: "bg-slate-400", Completed: "bg-sky-500", Strategic: "bg-brand-500",
    High: "bg-orange-500", Medium: "bg-sky-500", Low: "bg-slate-400",
    critical: "bg-rose-500", watch: "bg-amber-500", stable: "bg-emerald-500",
  };
  return (
    <span className={cx("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold tracking-tight", styles[tone] || styles.default)}>
      {dots[tone] && <span className={cx("h-1.5 w-1.5 rounded-full", dots[tone])} />}
      {children}
    </span>
  );
}

export function Card({ className = "", children, ...props }) {
  return <div className={cx("rounded-2xl border border-slate-200/70 bg-white shadow-card", className)} {...props}>{children}</div>;
}

export function Button({ children, variant = "primary", className = "", ...props }) {
  const styles = {
    primary: "bg-brand-gradient text-white shadow-brand-sm hover:shadow-brand-md hover:-translate-y-px active:translate-y-0 focus-visible:ring-brand-300",
    secondary: "border border-slate-200 bg-white text-slate-700 shadow-card hover:bg-slate-50 hover:border-slate-300 focus-visible:ring-brand-200",
    ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-brand-200",
    danger: "border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 focus-visible:ring-rose-200",
  };
  return <button className={cx("inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold tracking-tight transition-all duration-200 outline-none focus-visible:ring-4 disabled:opacity-50 disabled:pointer-events-none", styles[variant], className)} {...props}>{children}</button>;
}

export function Input({ className = "", ...props }) {
  return <input {...props} className={cx("h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100", className)} />;
}

export function Textarea({ className = "", ...props }) {
  return <textarea {...props} className={cx("min-h-24 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100", className)} />;
}

export function Select({ options, className = "", ...props }) {
  return <select {...props} className={cx("h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white bg-[length:1.1rem] bg-[right_0.75rem_center] bg-no-repeat px-3.5 pr-9 text-sm text-slate-900 shadow-sm outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100", className)} style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='none' stroke='%2364748b' stroke-width='1.6'%3E%3Cpath d='M6 8l4 4 4-4'/%3E%3C/svg%3E\")" }}>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select>;
}

export function Field({ label, children, wide = false }) {
  return <label className={wide ? "md:col-span-2" : "block"}><span className="text-sm font-medium text-slate-700">{label}</span><div className="mt-1.5">{children}</div></label>;
}

export function Modal({ title, subtitle, onClose, children, width = "max-w-3xl", fullscreen = false }) {
  return (
    <div className={cx("fixed inset-0 z-50 bg-ink/40 backdrop-blur-md", fullscreen ? "p-0" : "flex items-center justify-center p-4")}>
      <div
        className={cx(
          "w-full overflow-y-auto bg-white animate-fade-in",
          fullscreen
            ? "h-screen"
            : "max-h-[92vh] rounded-3xl border border-white/60 shadow-2xl ring-1 ring-slate-900/5",
          !fullscreen && width
        )}
      >
        <div className={cx("sticky top-0 z-10 flex items-start justify-between border-b border-slate-200/70 bg-white/90 backdrop-blur", fullscreen ? "px-8 py-6" : "p-6")}>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">{subtitle}</p>
            <h2 className="mt-0.5 text-2xl font-bold tracking-tight text-slate-900">{title}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function MetricCard({ title, value, helper, icon: Icon, accent = "brand" }) {
  const chips = {
    brand: "from-brand-500 to-brand-700 shadow-brand-sm",
    rose: "from-rose-400 to-rose-600 shadow-[0_2px_8px_-1px_rgba(244,63,94,0.4)]",
    emerald: "from-emerald-400 to-emerald-600 shadow-[0_2px_8px_-1px_rgba(16,185,129,0.4)]",
    amber: "from-amber-400 to-amber-600 shadow-[0_2px_8px_-1px_rgba(245,158,11,0.4)]",
    violet: "from-violet-400 to-violet-600 shadow-[0_2px_8px_-1px_rgba(139,92,246,0.4)]",
  };
  return (
    <Card className="group relative overflow-hidden p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-card-hover">
      <div className="pointer-events-none absolute -right-8 -top-10 h-24 w-24 rounded-full bg-gradient-to-br from-brand-50 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{value}</p>
          <p className="mt-1 text-sm text-slate-500">{helper}</p>
        </div>
        <div className={cx("rounded-2xl bg-gradient-to-br p-3 text-white", chips[accent] || chips.brand)}>
          <Icon size={20} />
        </div>
      </div>
    </Card>
  );
}

export function EmptyState({ title, text, action }) {
  return (
    <Card className="p-12 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
        <FolderKanban size={22} />
      </div>
      <h3 className="mt-4 text-lg font-semibold tracking-tight text-slate-900">{title}</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">{text}</p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </Card>
  );
}

export function StagePanel({ title, description, children }) {
  return (
    <Card className="border-slate-150 bg-white p-6">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {children}
    </Card>
  );
}

export function MiniTable({ columns, rows, emptyText = "No records." }) {
  if (!rows.length) {
    return <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">{emptyText}</div>;
  }

  const renderValue = (column, value) => {
    if (!value) return "—";
    if (column.key === "website") {
      return (
        <a href={value} target="_blank" rel="noreferrer" className="text-brand-600 underline decoration-slate-300 underline-offset-2">
          {value}
        </a>
      );
    }
    return value;
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="text-xs uppercase tracking-wide text-slate-500">
          <tr className="border-b border-slate-200">
            {columns.map((column) => (
              <th key={column.key} className="px-3 py-3 font-semibold">{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row, index) => (
            <tr key={row.number || row.vendorName || index} className="align-top">
              {columns.map((column) => (
                <td key={column.key} className="px-3 py-3 text-slate-700">{renderValue(column, row[column.key])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function EditableTable({ title, description, columns, rows, onChange, createRow }) {
  const updateCell = (rowIndex, key, value) => {
    onChange(rows.map((row, index) => (index === rowIndex ? { ...row, [key]: value } : row)));
  };

  const removeRow = (rowIndex) => {
    onChange(rows.filter((_, index) => index !== rowIndex));
  };

  const addRow = () => {
    onChange([...rows, createRow(rows.length)]);
  };

  return (
    <StagePanel title={title} description={description}>
      <div className="space-y-4">
        {rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">
            No entries yet. Add the first row to capture this stage properly.
          </div>
        ) : (
          <div className="space-y-4">
            {rows.map((row, rowIndex) => (
              <div key={rowIndex} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-900">Row {rowIndex + 1}</p>
                  <Button type="button" variant="secondary" className="px-3 py-2 text-xs" onClick={() => removeRow(rowIndex)}>
                    Remove
                  </Button>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {columns.map((column) => (
                    <Field key={column.key} label={column.label} wide={column.wide}>
                      {column.type === "textarea" ? (
                        <Textarea
                          value={row[column.key] || ""}
                          onChange={(event) => updateCell(rowIndex, column.key, event.target.value)}
                          className={column.className}
                        />
                      ) : (
                        <Input
                          value={row[column.key] || ""}
                          onChange={(event) => updateCell(rowIndex, column.key, event.target.value)}
                          placeholder={column.placeholder}
                        />
                      )}
                    </Field>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        <Button type="button" variant="secondary" onClick={addRow}>
          <Plus size={16} /> Add row
        </Button>
      </div>
    </StagePanel>
  );
}
