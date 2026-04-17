import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { SupportButton } from "./components/SupportButton";
import { Toaster } from "./components/ui/toaster";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import WorkerSignupPage from "./pages/WorkerSignupPage";
import GetHiredPage from "./pages/GetHiredPage";
import HireNowPage from "./pages/HireNowPage";
import DashboardPage from "./pages/DashboardPage";
import DemoPortalPage from "./pages/DemoPortalPage";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import LandingPage from "./pages/LandingPage";
import { lazy, ReactNode, Suspense, useEffect } from "react";

function useMetaPixel() {
  useEffect(() => {
    if ((window as any).fbq) return;
    const n: any = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    (window as any).fbq = n;
    (window as any)._fbq = n;
    n.push = n;
    n.loaded = true;
    n.version = "2.0";
    n.queue = [];
    const t = document.createElement("script");
    t.async = true;
    t.src = "https://connect.facebook.net/en_US/fbevents.js";
    const s = document.getElementsByTagName("script")[0];
    s.parentNode!.insertBefore(t, s);
    (window as any).fbq("init", "810287805470074");
    (window as any).fbq("track", "PageView");
  }, []);
}

function useChunkErrorReload() {
  useEffect(() => {
    const handler = (event: ErrorEvent) => {
      if (
        event.message?.includes("Failed to fetch dynamically imported module") ||
        event.message?.includes("Importing a module script failed") ||
        event.message?.includes("MIME type")
      ) {
        window.location.reload();
      }
    };
    window.addEventListener("error", handler);
    return () => window.removeEventListener("error", handler);
  }, []);
}

const ComplianceDashboardPage = lazy(() => import("./pages/ComplianceDashboardPage"));
const SalesPortalPage = lazy(() => import("./pages/SalesPortalPage"));
const PrivacyPolicyPage = lazy(() => import("./pages/PrivacyPolicyPage"));
const JobSharePage = lazy(() => import("./pages/JobSharePage"));

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { token, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
      </div>
    );
  }
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const { token, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
      </div>
    );
  }
  return token ? <Navigate to="/dashboard" replace /> : <>{children}</>;
}

function DemoRoute() {
  return <DemoPortalPage />;
}

function RoleRouter() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
      </div>
    );
  }
  if (user?.isComplianceOfficer) {
    return (
      <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center"><div className="h-8 w-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" /></div>}>
        <ComplianceDashboardPage />
      </Suspense>
    );
  }
  if (user?.isSalesAgent && !user?.isAdmin && user?.role !== "EMPLOYER") {
    return (
      <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center"><div className="h-8 w-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" /></div>}>
        <SalesPortalPage />
      </Suspense>
    );
  }
  return <DashboardPage />;
}

const PUBLIC_PATHS = ["/", "/login", "/register", "/worker-signup", "/gethired", "/hirenow", "/verify-email", "/privacy-policy", "/forgot-password", "/reset-password", "/demo"];
const JOB_SHARE_PATH_PREFIX = "/jobs/share/";

function GlobalSupportButton() {
  const { token } = useAuth();
  const location = useLocation();
  const isPublic = PUBLIC_PATHS.includes(location.pathname) || location.pathname.startsWith(JOB_SHARE_PATH_PREFIX);
  if (!token || isPublic) return null;
  return <SupportButton />;
}

function AppInner() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PublicOnlyRoute><LandingPage /></PublicOnlyRoute>} />
        <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/worker-signup" element={<WorkerSignupPage />} />
        <Route path="/gethired" element={<GetHiredPage />} />
        <Route path="/hirenow" element={<HireNowPage />} />
        <Route path="/demo" element={<DemoRoute />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route
          path="/jobs/share/:jobId"
          element={
            <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="h-8 w-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" /></div>}>
              <JobSharePage />
            </Suspense>
          }
        />
        <Route
          path="/privacy-policy"
          element={
            <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="h-8 w-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" /></div>}>
              <PrivacyPolicyPage />
            </Suspense>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <RoleRouter />
            </ProtectedRoute>
          }
        />
      </Routes>
      <GlobalSupportButton />
    </BrowserRouter>
  );
}

export default function App() {
  useChunkErrorReload();
  useMetaPixel();
  return (
    <AuthProvider>
      <AppInner />
      <Toaster />
    </AuthProvider>
  );
}
