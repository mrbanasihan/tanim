import "./App.css";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import SeedList from "./pages/SeedList";
import SeedForm from "./components/SeedForm";
import SeedDetail from "./pages/SeedDetail";
import GerminationRecordForm from "./pages/GerminationRecordForm";
import TransactionHistory from "./pages/TransactionHistory";
import TransactionForm from "./components/TransactionForm";
import NotificationsPage from "./pages/NotificationsPage";
import Reports from "./pages/Reports";
import ProjectsList from "./pages/ProjectsList";

function App() {
  return (
    <AuthProvider>
      <Router>
        <Toaster position="top-right" />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/seeds"
            element={
              <ProtectedRoute>
                <Layout>
                  <SeedList />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/seeds/new"
            element={<Navigate to="/seeds" replace />}
          />
          <Route
            path="/seeds/:id"
            element={
              <ProtectedRoute>
                <Layout>
                  <SeedDetail />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/seeds/:id/edit"
            element={<Navigate to="/seeds" replace />}
          />
          <Route
            path="/seeds/:seedId/germination"
            element={
              <ProtectedRoute>
                <Layout>
                  <GerminationRecordForm />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/transactions"
            element={
              <ProtectedRoute>
                <Layout>
                  <TransactionHistory />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/transactions/new"
            element={<Navigate to="/transactions" replace />}
          />
          <Route
            path="/transactions/:id/edit"
            element={<Navigate to="/transactions" replace />}
          />
          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <Layout>
                  <NotificationsPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <Layout>
                  <Reports />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects"
            element={
              <ProtectedRoute>
                <Layout>
                  <ProjectsList />
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
