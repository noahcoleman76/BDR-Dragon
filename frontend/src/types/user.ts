export type MeResponse = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: "ADMIN" | "BASIC";
  isActive: boolean;
  createdAt: string;
};
