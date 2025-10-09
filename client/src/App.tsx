import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";

// Layout Components
import MainLayout from "./layouts/MainLayout";
import AuthLayout from "./layouts/AuthLayout";

// Auth Pages
import SplashScreen from "./pages/SplashScreen";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ChangePassword"; // Fixed import name
import ChangePassword from "./pages/ChangePassword";

// Main App Pages
import Dashboard from "./pages/Dashboard";

// Service Pages
import GasServices from "./pages/GasServices";
import RoadsideServices from "./pages/RoadsideServices";
import OxygenServices from "./pages/OxygenServices";

// Vendor/Service Listing Pages
import ProviderDetail from "./pages/ProviderDetail";
import GasProviderDetail from "./pages/GasProviderDetail";
import GasProductDetail from "./pages/GasServices"; // ✅ ADD THIS IMPORT

// Cart & Payment
import Cart from "./pages/Cart";
import Payment from "./pages/Payment";
import Checkout from "./pages/Checkout"; // ✅ ADD THIS IMPORT


// User Management
import Account from "./pages/Account";
import EditProfile from "./pages/EditProfile";

// Vendor Pages
import VendorDashboard from "./pages/VendorDashboard"; // ✅ ADD THIS IMPORT

// Fallback
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Protected Route Component
const ProtectedRoute = ({ 
  children, 
  requiredUserType 
}: { 
  children: React.ReactNode;
  requiredUserType?: string;
}) => {
  const { currentUser, loading } = useAuth();
  const isAuthenticated = !!currentUser;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredUserType && currentUser?.user_type !== requiredUserType) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground mb-4">
            You don't have permission to access this page.
          </p>
          <Navigate to="/dashboard" replace />
        </div>
      </div>
    );
  }

  return <MainLayout>{children}</MainLayout>;
};

// Public Route Component (redirect if authenticated)
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { currentUser, loading } = useAuth();
  const isAuthenticated = !!currentUser;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <AuthLayout>{children}</AuthLayout>;
};

const AppRoutes = () => {
  return (
    <Routes>
      {/* Splash Screen - Public */}
      <Route path="/" element={<SplashScreen />} />
      
      {/* Auth Routes - Public only */}
      <Route path="/login" element={
        <PublicRoute>
          <Login />
        </PublicRoute>
      } />
      <Route path="/register" element={
        <PublicRoute>
          <Register />
        </PublicRoute>
      } />
    
      <Route path="/forgot-password" element={
        <PublicRoute>
          <ForgotPassword />
        </PublicRoute>
      } />
      <Route path="/reset-password" element={
        <PublicRoute>
          <ResetPassword />
        </PublicRoute>
      } />
      
      {/* Main App Routes - Protected */}
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      } />
      
      {/* Service Categories - Protected */}
      <Route path="/services/gas" element={
        <ProtectedRoute>
          <GasServices />
        </ProtectedRoute>
      } />
      <Route path="/services/roadside" element={
        <ProtectedRoute>
          <RoadsideServices />
        </ProtectedRoute>
      } />
      <Route path="/services/oxygen" element={
        <ProtectedRoute>
          <OxygenServices />
        </ProtectedRoute>
      } />
      
      {/* Vendor & Product Detail Pages - Protected */}
      <Route path="/vendor/:id" element={
        <ProtectedRoute>
          <ProviderDetail />
        </ProtectedRoute>
      } />
      <Route path="/services/gas/:id" element={
        <ProtectedRoute>
          <GasProviderDetail />
        </ProtectedRoute>
      } />
      <Route path="/gas-product/:id" element={ // ✅ ADD THIS ROUTE
        <ProtectedRoute>
          <GasProductDetail />
        </ProtectedRoute>
      } />
      // In your router configuration
      <Route path="/services/gas" element={<GasServices />} />
      <Route path="/gas-product/:id" element={<GasProviderDetail />} />
      // OR if you want the other URL pattern:
      <Route path="/services/gas_station/:id" element={<GasProviderDetail />} />
      {/* Cart & Checkout - Protected */}
      <Route path="/cart" element={
        <ProtectedRoute>
          <Cart />
        </ProtectedRoute>
      } />
       <Route path="/checkout" element={ // ✅ ADD THIS ROUTE
        <ProtectedRoute>
          <Checkout />
        </ProtectedRoute>
      } /> 
      <Route path="/payment" element={
        <ProtectedRoute>
          <Payment />
        </ProtectedRoute>
      } />
     
      {/* User Profile - Protected */}
      <Route path="/account" element={
        <ProtectedRoute>
          <Account />
        </ProtectedRoute>
      } />
      <Route path="/edit-profile" element={
        <ProtectedRoute>
          <EditProfile />
        </ProtectedRoute>
      } />
      <Route path="/change-password" element={
        <ProtectedRoute>
          <ChangePassword />
        </ProtectedRoute>
      } />

      {/* Vendor Dashboard - Protected for vendors only*/}
      <Route path="/vendor/dashboard" element={ // ✅ ADD THIS ROUTE
        <ProtectedRoute requiredUserType="vendor">
          <VendorDashboard />
        </ProtectedRoute>
      } />
      
      {/* Payment History - Protected */}
      <Route path="/payments" element={
        <ProtectedRoute>
          <div className="min-h-screen bg-background p-4">
            <h1 className="text-2xl font-bold mb-4">Payment History</h1>
            <p>Payment history page coming soon...</p>
          </div>
        </ProtectedRoute>
      } />
      
      {/* Become Vendor - Protected for customers only */}
      <Route path="/become-vendor" element={
        <ProtectedRoute requiredUserType="customer">
          <div className="min-h-screen bg-background p-4">
            <h1 className="text-2xl font-bold mb-4">Become a Vendor</h1>
            <p>Vendor registration page coming soon...</p>
          </div>
        </ProtectedRoute>
      } />
      
      {/* 404 Fallback */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;