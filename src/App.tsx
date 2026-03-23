import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "@/components/Navbar";
import RequireAuth from "@/components/RequireAuth";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Explore from "./pages/Explore";
import MapPage from "./pages/MapPage";
import Collections from "./pages/Collections";
import CreateCollection from "./pages/CreateCollection";
import CollectionDetail from "./pages/CollectionDetail";
import Onboarding from "./pages/Onboarding";
import ContentSync from "./pages/ContentSync";
import Processing from "./pages/Processing";
import TripMap from "./pages/TripMap";
import ItineraryPage from "./pages/Itinerary";
import Passport from "./pages/Passport";
import SyncError from "./pages/SyncError";
import NoResults from "./pages/NoResults";
import NotFound from "./pages/NotFound";
import AuthCallback from "./pages/AuthCallback";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Navbar />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/map" element={<MapPage />} />
            <Route
              path="/collections"
              element={
                <RequireAuth>
                  <Collections />
                </RequireAuth>
              }
            />
            <Route
              path="/collections/new"
              element={
                <RequireAuth>
                  <CreateCollection />
                </RequireAuth>
              }
            />
            <Route
              path="/collections/:id"
              element={
                <RequireAuth>
                  <CollectionDetail />
                </RequireAuth>
              }
            />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/sync" element={<ContentSync />} />
            <Route path="/processing" element={<Processing />} />
            <Route path="/trip/:city" element={<TripMap />} />
            <Route
              path="/itinerary"
              element={
                <RequireAuth>
                  <ItineraryPage />
                </RequireAuth>
              }
            />
            <Route
              path="/passport"
              element={
                <RequireAuth>
                  <Passport />
                </RequireAuth>
              }
            />
            <Route path="/sync-error" element={<SyncError />} />
            <Route path="/no-results" element={<NoResults />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
