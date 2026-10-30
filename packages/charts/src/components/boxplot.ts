export interface BoxPlotGroup {
  label: string;
  values: number[];
  color?: string | undefined;
}

export interface BoxPlotStats {
  label: string;
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  outliers: number[];
  color?: string | undefined;
}
