"use client";
import { useEffect, useState } from "react";
import { Asset, Summary } from "@/lib/types";
import Kpi from "@/components/Kpi";
import Stage1 from "@/components/Stage1";
import Stage2 from "@/components/Stage2";
import Stage3 from "@/components/Stage3";
import Stage4 from "@/components/Stage4";
import Stage5 from "@/components/Stage5";

const TABS = ["Overview", "1. Data", "2. Loss Tree", "3. Risk Ranking", "4. Value-at-Stake", "5. PdM Prioritizer"];

export default function Page() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [assets, setAssets] = useState<Asset[] | null>(null);
  const [tab, setTab] = useState(0);

  useEffect(() => {
    fetch("/data/summary.json").then((r) => r.json()).then(setSummary);
    fetch("/data/assets.json").then((r) => r.json()).then(setAssets);
  }, []);

  if (!summary || !assets) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading pipeline output…</div>;
  }

  return (
    <main className="min-h-screen max-w-7xl mx-auto px-4 py-8">
      <header className="mb-6">
        <div className="text-xs uppercase tracking-widest text-blue-400 font-semibold">Kearney KOSMIC · Case 9 · MVP</div>
        <h1 className="text-2xl md:text-3xl font-bold text-white mt-1">AI-Enabled OEE Loss Tree &amp; Predictive Maintenance Prioritizer</h1>
        <p className="text-sm text-gray-400 mt-2 max-w-3xl">
          Live end-to-end pipeline (Steps 1–5) running on the AI4I 2020 predictive-maintenance dataset ({summary.n_assets.toLocaleString()} assets,{" "}
          {summary.n_failures} logged failures). Standardize → build the loss tree → rank risk → price value-at-stake → prioritize spend as a budget-constrained portfolio.
        </p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Kpi label="Assets tracked" value={summary.n_assets.toLocaleString()} />
        <Kpi label="Logged failures" value={summary.n_failures.toString()} sub={`${(summary.loss_tree.failure_rate_overall * 100).toFixed(2)}% fleet failure rate`} />
        <Kpi label="Asset classes" value={summary.classes.join(" / ")} sub="ISO-14224-style criticality tiers" />
        <Kpi label="Total $ value-at-stake" value={`$${summary.loss_tree.by_asset_class.reduce((s, c) => s + c.total_value_at_stake, 0).toLocaleString()}`} />
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {TABS.map((t, i) => (
          <button key={t} onClick={() => setTab(i)} className={`tab-btn ${tab === i ? "tab-btn-active" : "tab-btn-inactive"}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 0 && <Overview summary={summary} />}
      {tab === 1 && <Stage1 summary={summary} sample={assets} />}
      {tab === 2 && <Stage2 summary={summary} />}
      {tab === 3 && <Stage3 assets={assets} summary={summary} />}
      {tab === 4 && <Stage4 summary={summary} />}
      {tab === 5 && <Stage5 assets={assets} />}

      <footer className="text-xs text-gray-600 mt-10 pb-6">
        MVP built for pilot demonstration — narrow, provably ROI-positive slice by design. Every intervention has a
        stated cost, risk-reduction %, and feasibility gate; nothing here overrides human sign-off.
      </footer>
    </main>
  );
}

function Overview({ summary }: { summary: Summary }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
      {[
        ["1. Data Foundation", "Raw ERP/MES/SCADA-style fields → one universal schema, sector logic in a thin config layer."],
        ["2. OEE Loss Tree", "Failures mapped to wear/thermal/power/mechanical/random taxonomy; anomaly = deviation from own class baseline."],
        ["3. Risk Ranking", "RPN = severity × risk% × criticality; Bayesian-shrunk so small-sample classes aren't over/under-ranked."],
        ["4. Value-at-Stake", "5 unblended $ lenses per asset + intervention library (cost vs. risk reduction)."],
        ["5. PdM Prioritizer", "Budget-constrained knapsack allocation with a hard feasibility filter, not a single sorted list."],
      ].map(([t, d]) => (
        <div key={t} className="card">
          <div className="text-white font-semibold text-sm mb-2">{t}</div>
          <div className="text-xs text-gray-400">{d}</div>
        </div>
      ))}
    </div>
  );
}
