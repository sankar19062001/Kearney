export type AssetClass = "L" | "M" | "H";
export type FailureMode = "wear" | "thermal" | "power" | "mechanical" | "random" | "none";

export interface Asset {
  asset_id: string;
  udi: number;
  asset_class: AssetClass;
  air_temp: number;
  process_temp: number;
  rpm: number;
  torque: number;
  tool_wear: number;
  failure_flag: number;
  failure_mode: FailureMode;
  risk_prob: number;
  severity: number;
  criticality: number;
  rpn: number;
  value_at_stake: number;
  intervention: string;
  intervention_cost: number;
  value_per_rupee: number;
  feasibility_score: number;
  urgency: number;
  priority_score: number;
}

export interface ByFailureMode {
  mode: FailureMode;
  value_at_stake: number;
  cum_pct: number;
}

export interface ByAssetClass {
  asset_class: AssetClass;
  assets: number;
  failures: number;
  avg_risk: number;
  total_value_at_stake: number;
}

export interface Summary {
  lens_totals: Record<string, number>;
  model_coefficients: Record<string, number>;
  model_intercept: number;
  n_assets: number;
  n_failures: number;
  classes: AssetClass[];
  loss_tree: {
    by_failure_mode: ByFailureMode[];
    by_asset_class: ByAssetClass[];
    failure_rate_overall: number;
    six_big_losses_map: Record<string, string>;
  };
  top_priority_assets: Asset[];
  severity_table: Record<string, number>;
  criticality_table: Record<string, number>;
  intervention_library: Record<string, { name: string; cost: number; risk_reduction: number }>;
}
