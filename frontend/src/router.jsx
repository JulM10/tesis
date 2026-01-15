import { Routes, Route } from 'react-router-dom';
import Login from './pages/login/login.jsx';

export default function Router() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/login" element={<Login />} />

      {/* fallback */}
      <Route path="*" element={<Login />} />
    </Routes>
  );
}
