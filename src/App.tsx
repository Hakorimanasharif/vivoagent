import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Login from "./pages/Login";
import DashboardLayout from "./components/DashboardLayout";
import DashboardHome from "./pages/dashboard/DashboardHome";
import PendingDeposits from "./pages/dashboard/PendingDeposits";
import PendingWithdrawals from "./pages/dashboard/PendingWithdrawals";
import UserTiers from "./pages/dashboard/UserTiers";
import Users from "./pages/dashboard/Users";
import Investors from "./pages/dashboard/Investors";
import DepositedUsers from "./pages/dashboard/DepositedUsers";
import WithdrawnUsers from "./pages/dashboard/WithdrawnUsers";
import Profile from "./pages/dashboard/Profile";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<DashboardHome />} />
            <Route path="pending-deposits" element={<PendingDeposits />} />
            <Route path="pending-withdrawals" element={<PendingWithdrawals />} />
            <Route path="users" element={<Users />} />
            <Route path="investors" element={<Investors />} />
            <Route path="deposited-users" element={<DepositedUsers />} />
            <Route path="withdrawn-users" element={<WithdrawnUsers />} />
            <Route path="user-tiers" element={<UserTiers />} />
            <Route path="profile" element={<Profile />} />
          </Route>
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
