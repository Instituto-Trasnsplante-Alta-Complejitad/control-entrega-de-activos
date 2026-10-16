/**
 * Utilidades centralizadas de permisos para ITAC.
 * El rol se calcula en el servidor a partir de los grupos/roles emitidos por Keycloak.
 */

export const isAdmin = (user) => user?.role === "admin";

export const canEditRecords = (user) => isAdmin(user);
export const canDeleteRecords = (user) => isAdmin(user);
export const canAdjustStock = (user) => isAdmin(user);
export const canEditConsumptions = (user) => isAdmin(user);
export const canManageCompatibility = (user) => isAdmin(user);
export const canManageMapa = (user) => isAdmin(user);
export const canViewHistory = (_user) => true; // todos pueden ver historial
