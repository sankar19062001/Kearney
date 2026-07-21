"use client";
import { Summary } from "@/lib/types";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

const LENS_LABEL: Record<string, string> = {
  recovered_capacity: "Recovered capacity",
  reduced_downtime: "Reduced downtime",
  improved_yield: "Improved yield",
  avoided_maintenance_cost: "Avoided maintenance cost",
  service_impact: "Service impact",
};
const COLORS = ["#2563eb", "#ef4444", "#10b981", "#f59e0b", "#a855f7"];

export default function Stage4({ summary }: { summary: Summary }) {
  const lensData = Object.entries(summary.lens_totals || {}).map(([k, v]) => ({ name: LENS_LABEL[k], value: v as number }));
  const interventions = Object.entries(summary.intervention_library);

  return (
    <div className="space-y-6">
      <div className="card">
        <h3 className="font-semibold text-white mb-2">Stage 4 — Value-at-Stake &amp; Scenario Analysis</h3>
        <p className="text-sm text-gray-400">
          Fleet-wide $ value-at-stake, kept as <b>5 separate lenses</b> rather than one blended number — a plant
          manager judged on yield and one judged on service impact each need their own figure. Lens weights are
          allocated per failure mode (e.g. a thermal fault skews toward "reduced downtime"; a random fault skews
          toward "service impact").
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <h4 className="font-semibold text-white mb-3">Fleet-wide value-at-stake, by lens</h4>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={lensData} dataKey="value" nameKey="name" outerRadius={100} label={(d) => `$${(d.value / 1000).toFixed(0)}k`}>
                {lensData.map((_, i) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}
              </Pie>
              <Tooltip contentStyle={{ background: "#111827", border: "1px solid #1f2937" }} formatter={(v: any) => `$${Number(v).toLocaleString()}`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h4 className="font-semibold text-white mb-3">Intervention library — cost vs. risk reduction</h4>
          <table className="dtbl">
            <thead><tr><th>Failure mode</th><th>Recommended intervention</th><th>Cost</th><th>Risk reduction</th></tr></thead>
            <tbody>
              {interventions.map(([mode, i]) => (
                <tr key={mode}>
                  <td className="text-gray-300">{mode}</td>
                  <td>{i.name}</td>
                  <td>${i.cost.toLocaleString()}</td>
                  <td>{(i.risk_reduction * 100).toFixed(0)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-gray-500 mt-3">
            Each intervention's expected risk-reduction feeds directly into Stage 5's value-per-rupee ranking —
            interventions aren't compared on cost alone.
          </p>
        </div>
      </div>
    </div>
  );
}
