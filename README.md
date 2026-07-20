# AI-Enabled OEE Loss Tree & Predictive Maintenance Prioritizer — MVP

Kearney KOSMIC Case 9. A working, deployable pipeline covering **Steps 1–5** of the design, running live
on the public AI4I 2020 predictive-maintenance dataset (10,000 assets, 3 ISO-14224-style criticality
classes L/M/H, 339 logged failures across 5 failure modes).

## What each step does (and why)

| Step | Logic | File |
|---|---|---|
| **1. Data Foundation** | Raw fields (Type, sensors, TWF/HDF/PWF/OSF/RNF) mapped onto one universal schema (`asset_id`, `asset_class`, condition signals, `failure_mode`). Sector logic stays in this thin mapping layer — the engine below never needs to change per source system. | `scripts/precompute.py`, `components/Stage1.tsx` |
| **2. OEE Loss Tree** | Failure codes → fixed loss-driver taxonomy (**wear / thermal / power / mechanical / random**) → Six Big Losses category. Anomaly signal = each asset's **z-score deviation from its own class baseline**, not raw sensor values — this is why one model generalizes across classes without retraining per class. | `components/Stage2.tsx` |
| **3. Risk Ranking** | A logistic regression trained on class-normalized sensor deviations gives `risk_prob`. It's then **Bayesian-shrunk** toward each class's own empirical failure rate (weight ∝ class sample size) so small classes aren't mis-ranked. `RPN = severity × risk_prob × criticality` (FMEA-style). | `components/Stage3.tsx` |
| **4. Value-at-Stake** | Each asset's $ value-at-stake is split into **5 unblended lenses** (recovered capacity, reduced downtime, improved yield, avoided maintenance cost, service impact) using failure-mode-specific weights, plus a fixed intervention library (cost + expected risk-reduction per failure mode). | `components/Stage4.tsx` |
| **5. PdM Prioritizer** | Funding is a **constrained portfolio-allocation problem**, not a sorted list: a feasibility hard-filter (spares/downtime-window/operator availability, simulated per asset) removes infeasible candidates, then a **greedy knapsack** fills the chosen budget pool in value-per-rupee order. Interactive budget slider + asset-class ("plant") filter = the what-if simulator. | `components/Stage5.tsx` |

All heavy computation (logistic regression, Bayesian shrinkage, RPN, value-at-stake, lens split) is
**precomputed offline** in `scripts/precompute.py` and shipped as static JSON (`public/data/*.json`) —
the deployed app is a pure static Next.js site, so it's fast on Vercel's free tier with no server cost.
The Stage 5 portfolio optimizer runs live, client-side, over the full 10,000-asset dataset.

## Regenerating the data (optional — pre-generated JSON is already included)

```bash
pip install pandas numpy scikit-learn
python3 scripts/precompute.py
```
This reads `ai4i2020.csv` (place it at the path referenced in the script, or edit the path) and rewrites
`public/data/summary.json` and `public/data/assets.json`.

## Run locally

```bash
npm install
npm run dev
```
Visit http://localhost:3000

## Deploy to Vercel

1. Push this folder to a new GitHub repo.
2. Go to https://vercel.com/new, import the repo.
3. Framework preset: **Next.js** (auto-detected). No environment variables needed.
4. Click Deploy — done. (Static JSON is bundled in `public/data/`, so there's nothing else to configure.)

## Honest MVP caveats (state these to a judge)

- The dataset has no explicit downtime-cost or production-output field, so `downtime_cost_hr` and
  `expected_downtime_hrs` are **stated assumptions per criticality class**, not measured — call this
  out explicitly, it's a credibility asset, not a weakness.
- Feasibility (spares/window/operator/recurrence) is **simulated** deterministically per asset for the
  demo; in production this comes from live CMMS/ERP data.
- Recurrence tracking is architectural — this is a single-snapshot dataset, not a time series, so
  true multi-period recurrence isn't demonstrated here.
