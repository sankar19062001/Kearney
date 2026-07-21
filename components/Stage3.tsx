"use client";
import { useMemo, useState } from "react";
import { Asset, Summary } from "@/lib/types";
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const MODE_COLOR: Record<string, string> = {
  wear: "#f59e0b", thermal: "#ef4444", power: "#a855f7", mechanical: "#f43f5e", random: "#64748b", none: "#334155",
};

export default function Stage3({ assets, summary }: { assets: Asset[]; summary: Summary }) {
  const [classFilter, setClassFilter] = useState<string>("ALL");

  const filtered = useMemo(
    () => (classFilter === "ALL" ? assets : assets.filter((a) => a.asset_class === classFilter)),
    [assets, classFilter]
  );

  const topRPN = useMemo(() => [...filtered].sort((a, b) => b.rpn - a.rpn).slice(0, 20), [filtered]);
  const scatterData = useMemo(() => filtered.filter((a) => a.failure_mode !== "none").slice(0, 800), [filtered]);

  return (
    <div className="space-y-6">
      <div className="card">
        <h3 className="font-semibold text-white mb-2">Stage 3 — Rank: Risk, Criticality, Bottlenecks</h3>
        <p className="text-sm text-gray-400">
          RPN = severity × risk probability × criticality (FMEA-style). Risk probability comes from a logistic model
          fit on class-normalized sensor deviations (coefficients below), then <b>Bayesian-shrunk</b> toward each
          class's own failure-rate prior in proportion to how much evidence that class has — so classes are compared
          fairly regardless of sample size.
        </p>
        <div className="text-xs text-gray-500 mt-2 font-mono">
          logit = {summary.model_intercept.toFixed(2)} + Σ(coef × z-score) — coefs:{" "}
          {Object.entries(summary.model_coefficients).map(([k, v]) => `${k}:${v.toFixed(2)}`).join("  ")}
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-white">Risk probability vs. $ value-at-stake, by loss-driver</h4>
          <div className="flex gap-2">
            {["ALL", "L", "M", "H"].map((c) => (
              <button key={c} onClick={() => setClassFilter(c)}
                className={`tab-btn ${classFilter === c ? "tab-btn-active" : "tab-btn-inactive"}`}>
                {c === "ALL" ? "All classes" : `Class ${c}`}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={320}>
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis type="number" dataKey="risk_prob" name="risk probability" stroke="#9ca3af"
              tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
            <YAxis type="number" dataKey="value_at_stake" name="$ value-at-stake" stroke="#9ca3af" />
            <ZAxis type="number" dataKey="rpn" range={[20, 200]} name="RPN" />
            <Tooltip cursor={{ strokeDasharray: "3 3" }} contentStyle={{ background: "#111827", border: "1px solid #1f2937" }}
              formatter={(v: any, n: any) => (n === "risk probability" ? `${(v * 100).toFixed(1)}%` : v)} />
            {["wear", "thermal", "power", "mechanical", "random"].map((m) => (
              <Scatter key={m} name={m} data={scatterData.filter((a) => a.failure_mode === m)} fill={MODE_COLOR[m]} />
            ))}
          </ScatterChart>
        </ResponsiveContainer>
        <p className="text-xs text-gray-500 mt-2">Bubble size = RPN. Top-right, largest bubbles = highest-priority bottleneck assets.</p>
      </div>

      <div className="card">
        <h4 className="font-semibold text-white mb-3">Top 20 assets by RPN {classFilter !== "ALL" && `(class ${classFilter})`}</h4>
        <table className="dtbl">
          <thead>
            <tr><th>asset_id</th><th>class</th><th>failure mode</th><th>risk %</th><th>severity</th><th>criticality</th><th>RPN</th><th>$ value-at-stake</th></tr>
          </thead>
          <tbody>
            {topRPN.map((a) => (
              <tr key={a.udi}>
                <td>{a.asset_id}</td><td>{a.asset_class}</td>
                <td style={{ color: MODE_COLOR[a.failure_mode] }}>{a.failure_mode}</td>
                <td>{(a.risk_prob * 100).toFixed(1)}%</td><td>{a.severity}</td><td>{a.criticality}</td>
                <td className="font-semibold text-white">{a.rpn}</td><td>${a.value_at_stake.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
