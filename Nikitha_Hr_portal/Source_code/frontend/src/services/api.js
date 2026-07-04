import axios from "axios";

const API = axios.create({
  baseURL: "https://vivacious-perfection-production-4c2d.up.railway.app",
});

API.interceptors.request.use((config) => {
  const email = localStorage.getItem("gmail");
  if (email) {
    config.headers["X-User-Email"] = email;
  }
  return config;
});

export default API;