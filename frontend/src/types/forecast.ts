import type { RangeType } from "./kpi";

export type ForecastLine = {
  actual: number;
  expected: number;
  projected: number;
  quota: number;
  pacePct: number | null;
};

export type KpiForecastResponse = {
  rangeType: RangeType;
  startDate: string;
  endDateExclusive: string;
  elapsedFraction: number;
  kpis: {
    calls: ForecastLine;
    emails: ForecastLine;
    meetingsBooked: ForecastLine;
    meetingsHeld: ForecastLine;
    opportunitiesCreated: ForecastLine;
    cleanOpportunities: ForecastLine;
  };
};
