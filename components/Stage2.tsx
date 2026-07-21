"use client";
import { Summary } from "@/lib/types";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";

const MODE_COLOR: Record<string, string> = {
  wear: "#f59e0b", thermal: "#ef4444", power: "#a855f7", mechanical: "#f43f5e", random: "#64748b", none: "#334155",
};

export default function Stage2({ summary }: { summary: Summary }) {
  const data = summary.loss_tree.by_failure_mode.filter((d) => d.mode !== "none");
  return (
    <div className="space-y-6">
      <div className="card">
        <h3 className="font-semibold text-white mb-2">Stage 2 — OEE Loss Tree &amp; Diagnostic Intelligence</h3>
        <p className="text-sm text-gray-400">
          Failure = Availability loss event. Every raw failure code (TWF / HDF / PWF / OSF / RNF) is mapped onto the
          fixed loss-driver taxonomy <span className="text-blue-300">wear · thermal · power · mechanical · random</span>,
          then onto the standard Six Big Losses / TPM category. Anomaly detection runs on each asset's{" "}
          <b>deviation from its own class baseline</b> (z-score vs class mean/std for air_temp, process_temp, rpm, torque,
          tool_wear) — not raw sensor values — which is why one engine works across L/M/H classes without retraining
          per class.
        </p>
      </div>

      <div className="card">
        <h4 className="font-semibold text-white mb-3">Value-at-stake by loss-driver category ($) — Pareto</h4>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis dataKey="mode" stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" />
            <Tooltip contentStyle={{ background: "#111827", border: "1px solid #1f2937" }} />
            <Bar dataKey="value_at_stake" radius={[6, 6, 0, 0]}>
              {data.map((d) => (<Cell key={d.mode} fill={MODE_COLOR[d.mode]} />))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <table className="dtbl mt-3">
          <thead><tr><th>Loss-driver</th><th>Six Big Losses category</th><th>$ value-at-stake</th><th>Cumulative %</th></tr></thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.mode}>
                <td style={{ color: MODE_COLOR[d.mode] }}>{d.mode}</td>
                <td className="text-gray-400">{summary.loss_tree.six_big_losses_map[d.mode]}</td>
                <td>${d.value_at_stake.toLocaleString()}</td>
                <td>{d.cum_pct}%</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs text-gray-500 mt-2">
          80/20 read: the top categories above account for the majority of cumulative $ loss — these are the
          bottleneck failure modes to fund first, fleet-wide.
        </p>
      </div>
    </div>
  );
}
