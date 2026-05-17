import Cookies from "js-cookie";

const resolveRequestOrigin = (event) => {
  if (!event) return "";
  const headers = event.node.req.headers;
  const proto =
    headers["x-forwarded-proto"] ||
    (event.node.req.connection && event.node.req.connection.encrypted
      ? "https"
      : "http");
  const host =
    headers["x-forwarded-host"] || headers["host"] || "localhost:3000";
  return `${proto}://${host}`;
};

export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig();
  const event = import.meta.server ? useRequestEvent() : null;

  let baseURL = "/api";
  if (import.meta.server) {
    const origin = resolveRequestOrigin(event);
    if (origin) {
      baseURL = `${origin}/api`;
    } else if (config.server.backHost) {
      baseURL = config.server.backHost;
    } else {
      throw new Error("Unable to resolve API base URL on the server side");
    }
  }

  const api = $fetch.create({
    baseURL,
    onRequest({ options }) {
      if (import.meta.server) return;
      const token = Cookies.get("token");
      if (!token) return;
      const headers = new Headers(options.headers || {});
      headers.set("Authorization", `Bearer ${token}`);
      options.headers = headers;
    },
  });

  const normalizeError = (error) => {
    const wrapped = new Error(error?.message || "Request failed");
    wrapped.response = {
      status: Number(error?.response?.status || error?.status || 500),
      data: error?.response?._data ?? error?.data ?? null,
    };
    return wrapped;
  };

  const request = async (url, config = {}) => {
    try {
      const data = await api(url, config);
      return { data };
    } catch (error) {
      throw normalizeError(error);
    }
  };

  const instance = {
    get(url, config = {}) {
      const { params, ...rest } = config;
      return request(url, { ...rest, method: "GET", query: params });
    },
    post(url, data, config = {}) {
      const { params, ...rest } = config;
      return request(url, { ...rest, method: "POST", body: data, query: params });
    },
    put(url, data, config = {}) {
      const { params, ...rest } = config;
      return request(url, { ...rest, method: "PUT", body: data, query: params });
    },
    patch(url, data, config = {}) {
      const { params, ...rest } = config;
      return request(url, { ...rest, method: "PATCH", body: data, query: params });
    },
    delete(url, config = {}) {
      const { params, ...rest } = config;
      return request(url, { ...rest, method: "DELETE", query: params });
    },
  };

  nuxtApp.provide("axios", instance);
});
