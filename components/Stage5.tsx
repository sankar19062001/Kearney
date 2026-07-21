"use client";
import { useMemo, useState } from "react";
import { Asset } from "@/lib/types";

function timingTier(rank: number, total: number): string {
  const pct = rank / total;
  if (pct < 0.1) return "This week";
  if (pct < 0.3) return "This month";
  return "This quarter";
}

export default function Stage5({ assets }: { assets: Asset[] }) {
  const [budget, setBudget] = useState(50000);
  const [pool, setPool] = useState<string>("ALL");
  const [feasOnly, setFeasOnly] = useState(true);

  const flagged = useMemo(
    () => assets.filter((a) => a.failure_mode !== "none" && (pool === "ALL" || a.asset_class === pool)),
    [assets, pool]
  );

  const allocation = useMemo(() => {
    let candidates = [...flagged];
    if (feasOnly) candidates = candidates.filter((a) => a.feasibility_score >= 0.75);
    candidates.sort((a, b) => b.value_per_rupee - a.value_per_rupee);

    const chosen: Asset[] = [];
    let spent = 0;
    for (const a of candidates) {
      if (spent + a.intervention_cost <= budget) {
        chosen.push(a);
        spent += a.intervention_cost;
      }
    }
    const valueProtected = chosen.reduce((s, a) => s + a.value_at_stake, 0);
    return { chosen, spent, valueProtected, roi: spent > 0 ? valueProtected / spent : 0, pool: candidates.length };
  }, [flagged, budget, feasOnly]);

  return (
    <div className="space-y-6">
      <div className="card">
        <h3 className="font-semibold text-white mb-2">Stage 5 — Predictive Maintenance Prioritizer (portfolio allocation)</h3>
        <p className="text-sm text-gray-400">
          Funding is a <b>constrained portfolio problem</b>, not a sorted list: assets are filtered by feasibility
          first (spares in stock, schedulable downtime window, operator available), then greedily filled into the
          budget pool in <b>value-per-rupee</b> order — this is the standard, well-validated knapsack heuristic and
          gets very close to optimal without needing solver infrastructure on stage.
        </p>
      </div>

      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="text-xs text-gray-400">Budget pool ($)</label>
            <input type="range" min={5000} max={300000} step={5000} value={budget}
              onChange={(e) => setBudget(Number(e.target.value))} className="w-full" />
            <div className="text-white font-semibold">${budget.toLocaleString()}</div>
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Budget pool / plant proxy (asset class)</label>
            <div className="flex gap-2">
              {["ALL", "L", "M", "H"].map((c) => (
                <button key={c} onClick={() => setPool(c)} className={`tab-btn ${pool === c ? "tab-btn-active" : "tab-btn-inactive"}`}>
                  {c === "ALL" ? "All" : c}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Feasibility hard filter</label>
            <button onClick={() => setFeasOnly(!feasOnly)} className={`tab-btn ${feasOnly ? "tab-btn-active" : "tab-btn-inactive"}`}>
              {feasOnly ? "ON — feasible assets only" : "OFF — ignore feasibility"}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card"><div className="text-xs text-gray-400">Candidate pool</div><div className="text-xl font-bold text-white">{allocation.pool}</div></div>
        <div className="card"><div className="text-xs text-gray-400">Assets funded</div><div className="text-xl font-bold text-white">{allocation.chosen.length}</div></div>
        <div className="card"><div className="text-xs text-gray-400">Budget spent</div><div className="text-xl font-bold text-white">${allocation.spent.toLocaleString()}</div></div>
        <div className="card"><div className="text-xs text-gray-400">Value protected / ROI</div><div className="text-xl font-bold text-emerald-400">${allocation.valueProtected.toLocaleString()} · {allocation.roi.toFixed(2)}x</div></div>
      </div>

      <div className="card">
        <h4 className="font-semibold text-white mb-3">Funded action list (ranked by value-per-rupee)</h4>
        <table className="dtbl">
          <thead>
            <tr><th>#</th><th>asset_id</th><th>class</th><th>failure mode</th><th>intervention</th><th>cost</th><th>value-at-stake</th><th>$/₹</th><th>timing</th></tr>
          </thead>
          <tbody>
            {allocation.chosen.slice(0, 40).map((a, i) => (
              <tr key={a.udi}>
                <td>{i + 1}</td><td>{a.asset_id}</td><td>{a.asset_class}</td><td>{a.failure_mode}</td>
                <td className="text-gray-300">{a.intervention}</td><td>${a.intervention_cost.toLocaleString()}</td>
                <td>${a.value_at_stake.toLocaleString()}</td><td className="text-white font-semibold">{a.value_per_rupee.toFixed(2)}</td>
                <td className="text-blue-300">{timingTier(i, allocation.chosen.length)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {allocation.chosen.length > 40 && (
          <p className="text-xs text-gray-500 mt-2">Showing top 40 of {allocation.chosen.length} funded assets.</p>
        )}
      </div>
    </div>
  );
}
