import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Layout from "./components/Layout";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import ForecastPage from "./pages/ForecastPage";
import TasksPage from "./pages/TasksPage";
import MarketPage from "./pages/MarketPage";
import AccountPage from "./pages/AccountPage";
import AdminPage from "./pages/AdminPage";

const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-4">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <Layout>
              <DashboardPage />
            </Layout>
          </RequireAuth>
        }
      />
      <Route
        path="/forecast"
        element={
          <RequireAuth>
            <Layout>
              <ForecastPage />
            </Layout>
          </RequireAuth>
        }
      />
      <Route
        path="/tasks"
        element={
          <RequireAuth>
            <Layout>
              <TasksPage />
            </Layout>
          </RequireAuth>
        }
      />
      <Route
        path="/market"
        element={
          <RequireAuth>
            <Layout>
              <MarketPage />
            </Layout>
          </RequireAuth>
        }
      />
      <Route
        path="/account"
        element={
          <RequireAuth>
            <Layout>
              <AccountPage />
            </Layout>
          </RequireAuth>
        }
      />
      <Route
        path="/admin"
        element={
          <RequireAuth>
            <Layout>
              {user?.role === "ADMIN" ? (
                <AdminPage />
              ) : (
                <div className="p-4">Forbidden</div>
              )}
            </Layout>
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
