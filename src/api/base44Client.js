async function apiRequest(path, options = {}) {
  const response = await fetch(path, {
    credentials: "same-origin",
    ...options,
    headers: {
      ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...options.headers,
    },
  });

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const error = new Error(data?.message || data || `HTTP ${response.status}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

function entityClient(entityName) {
  const basePath = `/api/entities/${encodeURIComponent(entityName)}`;

  return {
    list(sort = "created_date", limit = 500) {
      if (typeof sort === "object" && sort !== null) {
        limit = sort.limit ?? 500;
        sort = sort.sort ?? "created_date";
      }

      const query = new URLSearchParams({ sort, limit: String(limit) });
      return apiRequest(`${basePath}?${query}`);
    },

    filter(filters = {}, sort = "created_date", limit = 500) {
      const query = new URLSearchParams({
        filter: JSON.stringify(filters),
        sort,
        limit: String(limit),
      });
      return apiRequest(`${basePath}?${query}`);
    },

    create(data) {
      return apiRequest(basePath, { method: "POST", body: JSON.stringify(data) });
    },

    update(id, data) {
      return apiRequest(`${basePath}/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },

    delete(id) {
      return apiRequest(`${basePath}/${encodeURIComponent(id)}`, { method: "DELETE" });
    },

    deleteMany(filters = {}) {
      const query = new URLSearchParams({ filter: JSON.stringify(filters) });
      return apiRequest(`${basePath}?${query}`, { method: "DELETE" });
    },
  };
}

const entities = new Proxy({}, {
  get(_target, entityName) {
    return entityClient(String(entityName));
  },
});

export const base44 = {
  entities,
  auth: {
    me: () => apiRequest("/api/auth/me"),
    logout(returnTo = window.location.origin) {
      window.location.assign(`/oauth2/sign_out?rd=${encodeURIComponent(returnTo)}`);
    },
    redirectToLogin(returnTo = window.location.href) {
      window.location.assign(`/oauth2/start?rd=${encodeURIComponent(returnTo)}`);
    },
  },
  functions: {
    async invoke(name, payload = {}) {
      const data = await apiRequest(`/api/functions/${encodeURIComponent(name)}`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      return { data };
    },
  },
  integrations: {
    Core: {
      async UploadFile({ file }) {
        const body = new FormData();
        body.append("file", file);
        return apiRequest("/api/uploads", { method: "POST", body });
      },
    },
  },
};
