function header(req, name) {
  const value = req.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function splitClaim(value) {
  if (!value) return [];
  if (value.startsWith("[")) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {
      // Fall through to comma-separated parsing.
    }
  }
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

export function readIdentity(req) {
  const developmentBypass = process.env.DEV_AUTH_BYPASS === "true" && process.env.NODE_ENV !== "production";
  const email = header(req, "X-Forwarded-Email") || (developmentBypass ? "desarrollo@itac.com.ar" : "");
  if (!email) return null;

  const groups = splitClaim(header(req, "X-Forwarded-Groups"));
  const roles = splitClaim(header(req, "X-Forwarded-Roles"));
  const adminGroup = process.env.APP_ADMIN_GROUP || "/ARR-ITAC-IT";
  const adminRole = process.env.APP_ADMIN_ROLE || "control-activos-admin";
  const subject = header(req, "X-Forwarded-User") || email.toLowerCase();

  return {
    issuer: process.env.KEYCLOAK_ISSUER || "development",
    subject,
    email,
    name: header(req, "X-Forwarded-Preferred-Username") || email.split("@")[0],
    groups,
    roles,
    isAdmin: developmentBypass || groups.includes(adminGroup) || roles.includes(adminRole),
  };
}

export function requireIdentity(req, res, next) {
  const identity = readIdentity(req);
  if (!identity) return res.status(401).json({ message: "Autenticación requerida" });

  const allowedGroups = (process.env.APP_ALLOWED_GROUPS || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const allowedRole = process.env.APP_ALLOWED_ROLE || "";
  const authorized = allowedGroups.length === 0 && !allowedRole
    ? true
    : allowedGroups.some((group) => identity.groups.includes(group)) || identity.roles.includes(allowedRole);

  if (!authorized) return res.status(403).json({ message: "Tu cuenta no está habilitada para esta aplicación" });
  req.identity = identity;
  next();
}

export function requireAdmin(req, res, next) {
  if (!req.identity?.isAdmin) return res.status(403).json({ message: "Se requieren permisos de administración" });
  next();
}
