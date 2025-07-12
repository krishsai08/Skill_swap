import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Browse from "./pages/Browse";
import Requests from "./pages/Requests";
import Admin from "./pages/Admin";
import EditProfile from "./pages/EditProfile";
import CreateRequest from "./pages/CreateRequest";
import Networks from "./pages/Networks";
import Chat from "./pages/Chat";
import Rate from "./pages/Rate";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/login" element={<Navigate to="/auth" replace />} />
            <Route path="/signup" element={<Navigate to="/auth" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/browse" element={<Browse />} />
            <Route path="/requests" element={<Requests />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/network" element={<Networks />} />
            <Route path="/chat/:requestId" element={<Chat />} />
            <Route path="/rate/:requestId" element={<Rate />} />
            <Route path="/profile/edit" element={<EditProfile />} />
            <Route path="/request/:userId" element={<CreateRequest />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
