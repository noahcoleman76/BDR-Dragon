export type AdminMarket = {
  id: string;
  name: string;
  geographicDescription: string | null;
  accountExecutives: string | null;
  managerName: string | null;
  quotaCalls: number;
  quotaEmails: number;
  quotaMeetingsBooked: number;
  quotaCleanOpportunities: number;
  startDate: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminUser = {
  id: string;
  email: string;
  nickname: string | null;
  role: "ADMIN" | "BASIC";
  isActive: boolean;
  createdAt: string;
  markets: { id: string; name: string }[];
};

export type IntegrationStatus = {
  id?: string;
  scope: "GLOBAL";
  salesforceStatus: string;
  outreachStatus: string;
  lastSyncAt: string | null;
  createdAt?: string;
  updatedAt?: string;
};
