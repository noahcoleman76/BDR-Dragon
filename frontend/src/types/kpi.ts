export type RangeType = "day" | "week" | "month" | "year";

export type KpiMetrics = {
  calls: number;
  emails: number;
  meetingsBooked: number;
  meetingsHeld: number;
  opportunitiesCreated: number;
  cleanOpportunities: number;
};

export type KpiActualsResponse = {
  rangeType: RangeType;
  startDate: string;
  endDate: string;
  metrics: KpiMetrics;
};
