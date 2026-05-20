import axios from "axios";

const api = axios.create({
  baseURL: "/api/admin",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.error || error.message || "Request failed";
    return Promise.reject(new Error(message));
  }
);

export const auth = {
  me: () => api.get("/auth/me"),
  login: (data) => api.post("/auth/login", data),
  logout: () => api.post("/auth/logout"),
};

export const integrations = {
  list: (search = "") => api.get(`/integrations${search ? `?search=${encodeURIComponent(search)}` : ""}`),
  getById: (id) => api.get(`/integrations/${id}`),
  create: (data) => api.post("/integrations", data),
  update: (id, data) => api.put(`/integrations/${id}`, data),
  delete: (id) => api.delete(`/integrations/${id}`),
  getScenarios: (id) => api.get(`/integrations/${id}/scenarios`),
  importPreview: (id, collection) => api.post(`/integrations/${id}/import/preview`, { collection }),
  importConfirm: (id, data) => api.post(`/integrations/${id}/import/confirm`, data),
};

export const scenarios = {
  listAll: (search = "") => api.get(`/scenarios${search ? `?search=${encodeURIComponent(search)}` : ""}`),
  getById: (id) => api.get(`/scenarios/${id}`),
  create: (integrationId, data) => api.post(`/integrations/${integrationId}/scenarios`, data),
  update: (id, data) => api.put(`/scenarios/${id}`, data),
  delete: (id) => api.delete(`/scenarios/${id}`),
};

export const traffic = {
  list: ({ limit = 50, offset = 0, integrationId } = {}) => {
    const params = new URLSearchParams();
    params.set("limit", limit);
    params.set("offset", offset);
    if (integrationId) params.set("integrationId", integrationId);
    return api.get(`/traffic?${params.toString()}`);
  },
  getById: (id) => api.get(`/traffic/${id}`),
  delete: (id) => api.delete(`/traffic/${id}`),
  clear: (integrationId) => {
    const url = integrationId ? `/traffic?integrationId=${integrationId}` : "/traffic";
    return api.delete(url);
  },
};

export default api;
