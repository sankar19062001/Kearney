import { Asset, Summary } from "@/lib/types";

const SCHEMA_MAP = [
  ["UDI, Product ID", "asset_id", "Unique asset identifier"],
  ["Type (L/M/H)", "asset_class / criticality_tier", "ISO-14224-style equipment tier — L=low, M=medium, H=high criticality"],
  ["Air temperature [K]", "condition_signal.air_temp", "Sensor / condition monitoring input"],
  ["Process temperature [K]", "condition_signal.process_temp", "Sensor / condition monitoring input"],
  ["Rotational speed [rpm]", "condition_signal.rpm", "Sensor / condition monitoring input"],
  ["Torque [Nm]", "condition_signal.torque", "Sensor / condition monitoring input"],
  ["Tool wear [min]", "condition_signal.tool_wear", "Sensor / condition monitoring input"],
  ["Machine failure (0/1)", "failure_flag", "Downtime event flag"],
  ["TWF / HDF / PWF / OSF / RNF", "failure_mode (wear/thermal/power/mechanical/random)", "Raw failure codes mapped onto the fixed loss-driver taxonomy (Step 3, layer 1)"],
];

export default function Stage1({ summary, sample }: { summary: Summary; sample: Asset[] }) {
  return (
    <div className="space-y-6">
      <div className="card">
        <h3 className="font-semibold text-white mb-2">Stage 1 — Data Foundation &amp; Standardization</h3>
        <p className="text-sm text-gray-400 mb-4">
          Raw AI4I 2020 predictive-maintenance records (10,000 rows, 3 asset classes) are mapped onto one
          universal schema. Sector-specific column names live in a thin mapping layer; everything downstream
          (Stages 2–5) only ever reads the standardized fields — the same engine works whether the raw source is this
          CSV, an MES export, or a SCADA historian.
        </p>
        <table className="dtbl">
          <thead><tr><th>Raw field</th><th>Standardized field</th><th>Role</th></tr></thead>
          <tbody>
            {SCHEMA_MAP.map((r) => (
              <tr key={r[0]}><td className="text-gray-300">{r[0]}</td><td className="text-blue-300">{r[1]}</td><td className="text-gray-500">{r[2]}</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3 className="font-semibold text-white mb-2">Standardized sample (first 8 assets)</h3>
        <table className="dtbl">
          <thead>
            <tr><th>asset_id</th><th>class</th><th>air_temp K</th><th>process_temp K</th><th>rpm</th><th>torque Nm</th><th>tool_wear min</th><th>failure</th><th>failure_mode</th></tr>
          </thead>
          <tbody>
            {sample.slice(0, 8).map((a) => (
              <tr key={a.udi}>
                <td>{a.asset_id}</td><td>{a.asset_class}</td><td>{a.air_temp}</td><td>{a.process_temp}</td>
                <td>{a.rpm}</td><td>{a.torque}</td><td>{a.tool_wear}</td>
                <td>{a.failure_flag ? <span className="badge" style={{ background: "#7f1d1d", color: "#fca5a5" }}>YES</span> : "no"}</td>
                <td className="text-gray-400">{a.failure_mode}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {summary.loss_tree.by_asset_class.map((c) => (
          <div key={c.asset_class} className="card">
            <div className="text-sm text-gray-400">Class {c.asset_class} — criticality {summary.criticality_table[c.asset_class]}/10</div>
            <div className="text-xl font-bold text-white mt-1">{c.assets.toLocaleString()} assets</div>
            <div className="text-xs text-gray-500 mt-1">{c.failures} logged failures · avg risk {(c.avg_risk * 100).toFixed(2)}%</div>
          </div>
        ))}
      </div>
    </div>
  );
}
