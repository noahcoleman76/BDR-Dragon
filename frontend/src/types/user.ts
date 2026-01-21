export type MeResponse = {
  id: string;
  email: string;
  nickname: string | null;
  role: "ADMIN" | "BASIC";
  isActive: boolean;
  createdAt: string;
};
