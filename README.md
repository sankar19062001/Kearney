# AI-Enabled OEE Loss Tree & Predictive Maintenance Prioritizer — MVP

Kearney KOSMIC Case 9. A working, deployable pipeline covering **Steps 1–5** of the design, running live
on the public AI4I 2020 predictive-maintenance dataset (10,000 assets, 3 ISO-14224-style criticality
classes L/M/H, 339 logged failures across 5 failure modes).

## What each step does (and why)

| Step | Logic (formula, source) | File |
|---|---|---|
| **1. Data Foundation** | ISA-95 automation pyramid: Level 2 (SCADA/PLC/IIoT sensors) → Level 3 (MOMS/CMMS failure codes) → Level 4 (ERP, not present in this demo file — shown as a gap) → one universal schema. Sector logic stays in this thin mapping layer. | `components/Stage1.tsx` |
| **2. OEE Loss Tree** | Failure codes → fixed taxonomy (**wear/thermal/power/mechanical/random**) → Six Big Losses. The **mechanical (overstrain)** mode is modelled as a genuine **Wiener degradation process** `X(t) = μt + σW(t)` where `X(t) = tool_wear × torque` and the threshold ω is the real AI4I overstrain constant (11,000/12,000/13,000 for L/M/H). First-passage-time gives a closed-form **Inverse Gaussian RUL distribution** (`AI_OEE_Mathematical_Foundations.docx`, Module 2.1) — plotted live with the asset's actual current state. | `components/Stage2.tsx` |
| **3. Risk Ranking** | `RPN_AI(i) = S(i) × O(i) × D(i)` (Module 6.1) — Severity (1–10, fixed per mode), Occurrence = Bayesian-shrunk logistic-regression probability (data-driven, not expert-guessed), Detectability (1–10, fixed per mode). An **Explain panel** shows the full Sensor→HI→Degradation→RUL→Failure-Prob→RPN→Downtime→OEE formula chain (Module 7.1) for any selected asset, with every number substituted — this is the explainability requirement made concrete. | `components/Stage3.tsx` |
| **4. Value-at-Stake** | **OEE bridge** (Modules 3.3 / 6.3): `ΔA = (E[T_down|corrective] − E[T_down|PdM]) / T_p`, `ΔOEE ≈ ΔA·P·Q`, `Value_recovered = ΔOEE × T_p × Throughput × Margin`. Split into 5 unblended lenses + a fixed intervention library (cost, risk-reduction %). All assumptions (T_p, P, Q, γ, margin, throughput) are disclosed on-screen. | `components/Stage4.tsx` |
| **5. PdM Prioritizer** | Two explainable layers: a **CBM threshold policy** (Module 6.2) — Replace if `X(t)≥ω`, Maintain if `X(t)∈[0.75ω,ω)`, else Do Nothing — removes assets needing no action; the remainder is feasibility-filtered and **greedily knapsack-allocated** by value-per-rupee into an interactive budget slider. | `components/Stage5.tsx` |

All heavy computation (logistic regression, Bayesian shrinkage, Wiener/IG fit, RPN_AI, OEE bridge, CBM policy) is
**precomputed offline** in `scripts/precompute.py`, following the exact formulas in `AI_OEE_Mathematical_Foundations.docx`,
and shipped as static JSON (`public/data/*.json`). The deployed app is a pure static Next.js site — fast on Vercel's
free tier, no server cost. Stage 5's portfolio optimizer runs live, client-side, over the full 10,000-asset dataset.

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
