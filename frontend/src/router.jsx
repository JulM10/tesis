import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/login/login.jsx';
import Dashboard from './pages/dashboard/dashboard.jsx';
import Empleados from './pages/empleados/empleados.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

export default function Router() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/empleados"
        element={
          <ProtectedRoute>
            <Empleados />
          </ProtectedRoute>
        }
      />

      {/* fallback: cualquier ruta desconocida va al inicio */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
