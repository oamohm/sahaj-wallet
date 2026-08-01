import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { NetworkProvider } from "./hooks/useNetworks";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { Rewards } from "./pages/Rewards";
import { Stake } from "./pages/Stake";

function Shell() {
  const { user } = useAuth();

  if (!user) return <Login />;

  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/rewards" element={<Rewards />} />
      <Route path="/stake" element={<Stake />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NetworkProvider>
          <Shell />
        </NetworkProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
