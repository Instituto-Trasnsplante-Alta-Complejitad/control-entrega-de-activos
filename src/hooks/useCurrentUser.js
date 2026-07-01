import { useAuth } from "@/lib/AuthContext";
import { isAdmin, canEditRecords, canDeleteRecords, canAdjustStock, canEditConsumptions, canManageCompatibility, canManageMapa } from "@/lib/permissions";

/**
 * Hook que expone el usuario actual y sus permisos calculados.
 */
export function useCurrentUser() {
  const { user } = useAuth();
  return {
    user,
    isAdmin: isAdmin(user),
    canEdit: canEditRecords(user),
    canDelete: canDeleteRecords(user),
    canAdjustStock: canAdjustStock(user),
    canEditConsumptions: canEditConsumptions(user),
    canManageCompatibility: canManageCompatibility(user),
    canManageMapa: canManageMapa(user),
  };
}