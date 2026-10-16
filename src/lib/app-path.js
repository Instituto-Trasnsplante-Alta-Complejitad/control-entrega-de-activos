const configuredBaseUrl = import.meta.env.BASE_URL || "/";

export const appBasePath = configuredBaseUrl === "/"
  ? ""
  : `/${configuredBaseUrl.replace(/^\/+|\/+$/g, "")}`;

export function withAppBasePath(path = "/") {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${appBasePath}${normalizedPath}` || "/";
}

export function withoutAppBasePath(pathname) {
  if (!appBasePath) return pathname;
  if (pathname === appBasePath) return "/";
  return pathname.startsWith(`${appBasePath}/`)
    ? pathname.slice(appBasePath.length)
    : pathname;
}
