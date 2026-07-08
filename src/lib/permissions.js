/**
 * Utilidades centralizadas de permisos para ITAC.
 * El rol del usuario viene de base44.auth.me() → user.role ("admin" | "user").
 * Los usuarios con email del dominio @itac.com.ar tienen permisos de escritura y lectura.
 */

const ITAC_DOMAIN = "@itac.com.ar";

export const isItacDomain = (user) => {
  const email = user?.email?.toLowerCase().trim();
  return !!email && email.endsWith(ITAC_DOMAIN);
};

export const isAdmin = (user) => user?.role === "admin" || isItacDomain(user);

export const canEditRecords = (user) => isAdmin(user);
export const canDeleteRecords = (user) => isAdmin(user);
export const canAdjustStock = (user) => isAdmin(user);
export const canEditConsumptions = (user) => isAdmin(user);
export const canManageCompatibility = (user) => isAdmin(user);
export const canManageMapa = (user) => isAdmin(user);
export const canViewHistory = (_user) => true; // todos pueden ver historial