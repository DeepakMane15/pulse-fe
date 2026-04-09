export type AuthUser = {
  id: string;
  email: string;
  tenantId: string;
  role: string;
  roleId: string;
  clearanceLevel: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type LoginResponseBody = {
  message: string;
  data: {
    accessToken: string;
    user: AuthUser;
  };
};

export type ApiErrorBody = {
  message: string;
  details?: unknown;
};
