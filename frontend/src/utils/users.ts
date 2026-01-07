import { User, UserRole } from "@/types/user";

export const isAdmin = (user: User | null): boolean => {
  return user?.role === UserRole.JudgeAdmin;
};

export const isTA = (user: User | null): boolean => {
  return user?.role === UserRole.TA;
};

export const isAdminOrTA = (user: User | null): boolean => {
  return user?.role === UserRole.JudgeAdmin || user?.role === UserRole.TA;
};
