import React, { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ClipboardCheck, FlaskConical, FolderKanban, TrendingUp } from "lucide-react";
import { stages, statuses, priorities, products, CHART_COLORS, STATUS_BAR } from "../lib/constants.js";
import { daysUntil, formatAmount, parseAmount } from "../lib/utils.js";
import { Card, MetricCard } from "../components/ui.jsx";

const PRIORITY_COLORS = {
  Strategic: CHART_COLORS.brand,
  High: "#f97316",
  Medium: CHART_COLORS.sky,
  Low: CHART_COLORS.slate,
};

const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid #e2e8f0",
  boxShadow: "0 4px 12px rgba(15,23,42,0.08)",
  fontSize: 13,
};

function ChartCard({ title, subtitle, children, className = "" }) {
  return (
    <Card className={`p-5 ${className}`}>
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
      <div className="mt-4 h-64">{children}</div>
    </Card>
  );
}

export default function AnalyticsView({ projects, decisions }) {
  const funnel = useMemo(
    () => stages.map((stage) => ({ stage: stage.replace("Deployment ", "Deploy "), count: projects.filter((p) => p.stage === stage).length })),
    [projects]
  );

  const statusMix = useMemo(
    () => statuses
      .map((status) => ({ name: status, value: projects.filter((p) => p.status === status).length }))
      .filter((item) => item.value > 0),
    [projects]
  );

  const byProduct = useMemo(() => {
    return products
      .map((product) => {
        const items = projects.filter((p) => p.productArea === product);
        const row = { product: product === "Network Optimization" ? "Network Opt." : product };
        for (const priority of priorities) {
          row[priority] = items.filter((p) => p.priority === priority).length;
        }
        row.total = items.length;
        return row;
      })
      .filter((row) => row.total > 0);
  }, [projects]);

  const pocInvestment = useMemo(() => {
    return projects
      .map((project) => ({
        name: project.name.length > 22 ? `${project.name.slice(0, 22)}…` : project.name,
        budget: parseAmount(project.pocBudget) ?? 0,
        spend: parseAmount(project.pocSpend) ?? 0,
      }))
      .filter((row) => row.budget > 0 || row.spend > 0);
  }, [projects]);

  const decisionAging = useMemo(() => {
    const open = decisions.filter((decision) => decision.status !== "Closed");
    const buckets = [
      { bucket: "Overdue", count: 0, fill: CHART_COLORS.rose },
      { bucket: "This week", count: 0, fill: CHART_COLORS.amber },
      { bucket: "Later", count: 0, fill: CHART_COLORS.brand },
      { bucket: "No date", count: 0, fill: CHART_COLORS.slate },
    ];
    for (const decision of open) {
      const days = daysUntil(decision.due);
      if (days === null) buckets[3].count += 1;
      else if (days < 0) buckets[0].count += 1;
      else if (days <= 7) buckets[1].count += 1;
      else buckets[2].count += 1;
    }
    return buckets;
  }, [decisions]);

  const kpis = useMemo(() => {
    const activePocs = projects.filter((p) => p.stage === "POC").length;
    const outcomes = projects.filter((p) => p.pocOutcome && p.pocOutcome !== "Pending");
    const successes = outcomes.filter((p) => p.pocOutcome === "Success").length;
    const winRate = outcomes.length ? Math.round((successes / outcomes.length) * 100) : null;
    const openDecisions = decisions.filter((d) => d.status !== "Closed").length;
    return { activePocs, winRate, openDecisions };
  }, [projects, decisions]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Portfolio size" value={projects.length} helper="Tracked initiatives" icon={FolderKanban} />
        <MetricCard title="Active PoCs" value={kpis.activePocs} helper="In proof of concept" icon={FlaskConical} accent="violet" />
        <MetricCard title="PoC win rate" value={kpis.winRate === null ? "—" : `${kpis.winRate}%`} helper="Of concluded PoCs" icon={TrendingUp} accent="emerald" />
        <MetricCard title="Open decisions" value={kpis.openDecisions} helper="Awaiting alignment" icon={ClipboardCheck} accent="amber" />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <ChartCard title="Stage funnel" subtitle="Where initiatives sit across the innovation workflow">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={funnel} layout="vertical" margin={{ left: 8, right: 24 }}>
              <CartesianGrid horizontal={false} stroke="#eef2f6" />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: "#64748b" }} />
              <YAxis type="category" dataKey="stage" width={130} tick={{ fontSize: 12, fill: "#334155" }} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(11,95,176,0.05)" }} />
              <Bar dataKey="count" name="Projects" fill={CHART_COLORS.brand} radius={[0, 6, 6, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Health mix" subtitle="Status distribution across the portfolio">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={statusMix} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="80%" paddingAngle={3}>
                {statusMix.map((entry) => (
                  <Cell key={entry.name} fill={STATUS_BAR[entry.name]?.hex || CHART_COLORS.slate} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: 13 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Product areas" subtitle="Initiatives per product area, split by priority">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byProduct} margin={{ right: 16 }}>
              <CartesianGrid vertical={false} stroke="#eef2f6" />
              <XAxis dataKey="product" tick={{ fontSize: 11, fill: "#64748b" }} interval={0} angle={-14} textAnchor="end" height={50} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#64748b" }} width={28} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(11,95,176,0.05)" }} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 13 }} />
              {priorities.map((priority) => (
                <Bar key={priority} dataKey={priority} stackId="a" fill={PRIORITY_COLORS[priority]} radius={priority === "Strategic" ? [4, 4, 0, 0] : [0, 0, 0, 0]} barSize={28} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Decision aging" subtitle="Open decisions by urgency">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={decisionAging} margin={{ right: 16 }}>
              <CartesianGrid vertical={false} stroke="#eef2f6" />
              <XAxis dataKey="bucket" tick={{ fontSize: 12, fill: "#64748b" }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#64748b" }} width={28} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(11,95,176,0.05)" }} />
              <Bar dataKey="count" name="Decisions" radius={[6, 6, 0, 0]} barSize={42}>
                {decisionAging.map((entry) => (
                  <Cell key={entry.bucket} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {pocInvestment.length > 0 && (
        <ChartCard title="PoC investment" subtitle="Budget vs. spend per proof of concept" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={pocInvestment} margin={{ right: 16 }}>
              <CartesianGrid vertical={false} stroke="#eef2f6" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#64748b" }} interval={0} />
              <YAxis tickFormatter={(value) => formatAmount(value)} tick={{ fontSize: 12, fill: "#64748b" }} width={56} />
              <Tooltip contentStyle={tooltipStyle} formatter={(value) => formatAmount(value)} cursor={{ fill: "rgba(11,95,176,0.05)" }} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 13 }} />
              <Bar dataKey="budget" name="Budget" fill={CHART_COLORS.brandSoft} radius={[6, 6, 0, 0]} barSize={32} />
              <Bar dataKey="spend" name="Spend" fill={CHART_COLORS.brand} radius={[6, 6, 0, 0]} barSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}
    </div>
  );
}
