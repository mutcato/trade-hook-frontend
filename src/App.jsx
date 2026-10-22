import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./components/AppLayout";
import { useAuth } from "./context/AuthContext";
import Credits from "./pages/Credits";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Settings from "./pages/Settings";
import Strategies from "./pages/Strategies";
import StrategyBuilder from "./pages/StrategyBuilder";
import StrategyDetail from "./pages/StrategyDetail";

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <PrivateRoute>
            <AppLayout />
          </PrivateRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="strategies" element={<Strategies />} />
        <Route path="strategies/new" element={<StrategyBuilder />} />
        <Route path="strategies/:id/edit" element={<StrategyBuilder />} />
        <Route path="strategies/:id" element={<StrategyDetail />} />
        {/* Also the provider's return target — see success_url in billing.services. */}
        <Route path="credits" element={<Credits />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
