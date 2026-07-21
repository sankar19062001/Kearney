import pandas as pd, numpy as np, json, sys
from sklearn.linear_model import LogisticRegression

df = pd.read_csv('/home/claude/ai4i_data/ai4i2020.csv')
df.columns = [c.strip() for c in df.columns]

FEATS = ['Air temperature [K]','Process temperature [K]','Rotational speed [rpm]','Torque [Nm]','Tool wear [min]']
SHORT = ['air_temp','process_temp','rpm','torque','tool_wear']

# ---- Stage 1: standardize + baseline per asset class (Type = L/M/H) ----
classes = df['Type'].unique().tolist()
baseline = {}
for c in classes:
    sub = df[df['Type']==c]
    baseline[c] = {SHORT[i]: {'mean': float(sub[f].mean()), 'std': float(sub[f].std() or 1)} for i,f in enumerate(FEATS)}

# ---- train logistic regression (Bayesian-lite likelihood model) on z-scored features ----
Z = pd.DataFrame()
for i,f in enumerate(FEATS):
    m = df['Type'].map(lambda c: baseline[c][SHORT[i]]['mean'])
    s = df['Type'].map(lambda c: baseline[c][SHORT[i]]['std'])
    Z[SHORT[i]] = (df[f]-m)/s
y = df['Machine failure']
clf = LogisticRegression(max_iter=1000, class_weight='balanced')
clf.fit(Z, y)
coefs = {SHORT[i]: float(clf.coef_[0][i]) for i in range(len(SHORT))}
intercept = float(clf.intercept_[0])

FAILMODE_ORDER = [('TWF','wear'), ('HDF','thermal'), ('PWF','power'), ('OSF','mechanical'), ('RNF','random')]
SEVERITY = {'wear':6,'thermal':8,'power':7,'mechanical':9,'random':4,'none':1}
CRIT = {'H':9,'M':5,'L':2}
DOWNTIME_COST_HR = {'H':1200,'M':700,'L':300}
EXP_DOWNTIME_HRS = {'wear':4,'thermal':6,'power':5,'mechanical':8,'random':2,'none':0}
INTERVENTIONS = {
 'wear':      {'name':'Predictive monitoring + tool-wear sensor', 'cost':1500, 'risk_reduction':0.55},
 'thermal':   {'name':'Cooling/heat-dissipation preventive maint','cost':2200, 'risk_reduction':0.60},
 'power':     {'name':'Power-train inspection & spare readiness', 'cost':1800, 'risk_reduction':0.50},
 'mechanical':{'name':'Process parameter adjustment (overstrain)','cost':2500, 'risk_reduction':0.65},
 'random':    {'name':'Operator training / random-fault audit',  'cost':600,  'risk_reduction':0.20},
 'none':      {'name':'Routine preventive maintenance',          'cost':300,  'risk_reduction':0.10},
}

def zscore(row):
    c = row['Type']
    out = {}
    for i,f in enumerate(FEATS):
        b = baseline[c][SHORT[i]]
        out[SHORT[i]] = (row[f]-b['mean'])/b['std']
    return out

def sigmoid(x): return 1/(1+np.exp(-x))

LENS_WEIGHTS = {
 'wear':       {'recovered_capacity':0.30,'reduced_downtime':0.25,'improved_yield':0.15,'avoided_maintenance_cost':0.20,'service_impact':0.10},
 'thermal':    {'recovered_capacity':0.20,'reduced_downtime':0.35,'improved_yield':0.10,'avoided_maintenance_cost':0.20,'service_impact':0.15},
 'power':      {'recovered_capacity':0.25,'reduced_downtime':0.30,'improved_yield':0.10,'avoided_maintenance_cost':0.15,'service_impact':0.20},
 'mechanical': {'recovered_capacity':0.20,'reduced_downtime':0.20,'improved_yield':0.15,'avoided_maintenance_cost':0.30,'service_impact':0.15},
 'random':     {'recovered_capacity':0.15,'reduced_downtime':0.20,'improved_yield':0.10,'avoided_maintenance_cost':0.15,'service_impact':0.40},
 'none':       {'recovered_capacity':0.20,'reduced_downtime':0.20,'improved_yield':0.20,'avoided_maintenance_cost':0.20,'service_impact':0.20},
}

records = []
n_by_class = df['Type'].value_counts().to_dict()
for idx, row in df.iterrows():
    z = zscore(row)
    logit = intercept + sum(coefs[k]*z[k] for k in SHORT)
    risk_prob = float(sigmoid(logit))

    fmode = 'none'
    for col, mode in FAILMODE_ORDER:
        if row[col] == 1:
            fmode = mode; break

    ac = row['Type']
    n = n_by_class[ac]
    shrink = n / (n + 50)  # bayesian shrinkage toward class prior with k=50
    class_prior_rate = float(df[df['Type']==ac]['Machine failure'].mean())
    risk_prob_adj = shrink*risk_prob + (1-shrink)*class_prior_rate

    severity = SEVERITY[fmode]
    criticality = CRIT[ac]
    rpn = round(severity * risk_prob_adj*10 * criticality, 2)

    downtime_cost_hr = DOWNTIME_COST_HR[ac]
    exp_downtime = EXP_DOWNTIME_HRS[fmode]
    consequence = downtime_cost_hr * exp_downtime
    value_at_stake = round(consequence * risk_prob_adj, 2)

    interv = INTERVENTIONS[fmode]
    value_per_rupee = round(value_at_stake / interv['cost'], 4) if interv['cost'] else 0
    lens_w = LENS_WEIGHTS[fmode]
    lenses = {k: round(value_at_stake*w,2) for k,w in lens_w.items()}

    # deterministic pseudo feasibility checklist seeded by UDI
    seed = int(row['UDI'])
    spares = (seed % 3) != 0
    window = (seed % 4) != 0
    operator = (seed % 5) != 0
    recurred = (seed % 7) == 0
    feas_score = round((int(spares)+int(window)+int(operator)+int(recurred))/4, 2)

    urgency = round(risk_prob_adj*0.6 + (criticality/9)*0.4, 3)
    expected_return = round(value_per_rupee, 4)
    priority_score = round(value_at_stake/1000 * feas_score * urgency * (1+expected_return), 3)

    records.append({
        'asset_id': row['Product ID'], 'udi': int(row['UDI']), 'asset_class': ac,
        'air_temp': row['Air temperature [K]'], 'process_temp': row['Process temperature [K]'],
        'rpm': int(row['Rotational speed [rpm]']), 'torque': row['Torque [Nm]'],
        'tool_wear': int(row['Tool wear [min]']),
        'z': {k: round(v,2) for k,v in z.items()},
        'failure_flag': int(row['Machine failure']), 'failure_mode': fmode,
        'risk_prob': round(risk_prob_adj,4), 'severity': severity, 'criticality': criticality,
        'rpn': rpn, 'downtime_cost_hr': downtime_cost_hr, 'exp_downtime_hrs': exp_downtime,
        'consequence_dollars': consequence, 'value_at_stake': value_at_stake, 'lenses': lenses,
        'intervention': interv['name'], 'intervention_cost': interv['cost'],
        'risk_reduction_pct': interv['risk_reduction'], 'value_per_rupee': value_per_rupee,
        'feasibility': {'spares_in_stock':spares,'downtime_window':window,'operator_available':operator,'recurred_recently':recurred},
        'feasibility_score': feas_score, 'urgency': urgency, 'priority_score': priority_score,
    })

# ---- Stage 3 rollups: Pareto by failure mode ($ terms), by class ----
recs_df = pd.DataFrame(records)
pareto_mode = recs_df.groupby('failure_mode')['value_at_stake'].sum().sort_values(ascending=False)
pareto_mode_pct = (pareto_mode.cumsum()/pareto_mode.sum()*100).round(2)
loss_tree = {
  'by_failure_mode': [{'mode':m,'value_at_stake':round(v,2),'cum_pct':float(pareto_mode_pct[m])} for m,v in pareto_mode.items()],
  'by_asset_class': recs_df.groupby('asset_class').agg(
        assets=('udi','count'), failures=('failure_flag','sum'),
        avg_risk=('risk_prob','mean'), total_value_at_stake=('value_at_stake','sum')).round(4).reset_index().to_dict('records'),
  'failure_rate_overall': round(float(df['Machine failure'].mean()),4),
  'six_big_losses_map': {'wear':'Equipment Failure (tool wear-out)','thermal':'Equipment Failure (heat dissipation)',
        'power':'Reduced Speed / Equipment Failure (power loss)','mechanical':'Equipment Failure (overstrain)',
        'random':'Minor Stops (random fault)','none':'No loss recorded'}
}

top_assets = recs_df.sort_values('priority_score', ascending=False).head(300).to_dict('records')

lens_totals = {}
for k in ['recovered_capacity','reduced_downtime','improved_yield','avoided_maintenance_cost','service_impact']:
    lens_totals[k] = round(sum(r['lenses'][k] for r in records), 2)

summary = {
  'lens_totals': lens_totals,
  'model_coefficients': coefs, 'model_intercept': intercept,
  'n_assets': len(records), 'n_failures': int(df['Machine failure'].sum()),
  'classes': classes, 'baseline': baseline,
  'loss_tree': loss_tree,
  'top_priority_assets': top_assets,
  'severity_table': SEVERITY, 'criticality_table': CRIT,
  'intervention_library': INTERVENTIONS,
}

with open('/home/claude/oee-mvp/public/data/summary.json','w') as f:
    json.dump(summary, f)
with open('/home/claude/oee-mvp/public/data/assets.json','w') as f:
    json.dump(records, f)

print('rows', len(records), 'failures', int(df['Machine failure'].sum()))
print('coefs', coefs, 'intercept', intercept)
