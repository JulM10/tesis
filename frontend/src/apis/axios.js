import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:3000/api", // backend
  withCredentials: false,
  headers: {
    "Content-Type": "application/json"
  }
});

api.interceptors.response.use(
  response => response,
  error => {
    console.error("[API ERROR]", {
      url: error.config?.url,
      method: error.config?.method,
      data: error.config?.data,
      response: error.response?.data
    });
    return Promise.reject(error);
  }
);

export default api;
