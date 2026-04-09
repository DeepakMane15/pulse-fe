/**
 * Bitwise permission masks — keep in sync with `backend/src/constants/roles.ts`.
 * Access rule (same as backend): (userClearance & requiredMask) === requiredMask
 */
export const PERMISSIONS = {
  VIEW_VIDEO: 1 << 0,
  UPLOAD_VIDEO: 1 << 1,
  EDIT_VIDEO: 1 << 2,
  DELETE_VIDEO: 1 << 3,
  MANAGE_USERS: 1 << 4,
  MANAGE_TENANT: 1 << 5,
  GLOBAL_ADMIN: 1 << 6
} as const;

export type PermissionKey = keyof typeof PERMISSIONS;

export function hasClearance(userClearance: number, requiredMask: number): boolean {
  return (userClearance & requiredMask) === requiredMask;
}
