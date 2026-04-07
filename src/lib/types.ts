export type UserType = "worker" | "employer" | "admin";

export interface SessionUser {
  userId: number;
  userType: UserType;
  fullName: string;
  mobileNumber: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
}
