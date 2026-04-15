import "./App.css";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import SeedList from "./pages/SeedList";
import SeedForm from "./pages/SeedForm";
import SeedDetail from "./pages/SeedDetail";
import TransactionHistory from "./pages/TransactionHistory";
import TransactionForm from "./pages/TransactionForm";
import Reports from "./pages/Reports";

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
            element={
              <ProtectedRoute>
                <Layout>
                  <SeedForm />
                </Layout>
              </ProtectedRoute>
            }
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
            element={
              <ProtectedRoute>
                <Layout>
                  <SeedForm />
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
            element={
              <ProtectedRoute>
                <Layout>
                  <TransactionForm />
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
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
