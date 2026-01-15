import axios from "../apis/axios.js";

export const login = async ({ email }) => {
  // ⚠️ Simulación hasta que exista /auth/login
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        id: 1,
        nombre: "Usuario Demo",
        email,
        rol: email.includes("admin") ? "administrador" : "empleado",
      });
    }, 800);
  });
};
