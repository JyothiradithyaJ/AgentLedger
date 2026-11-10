import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Header } from "./components/Header";
import { SandboxBanner } from "./components/SandboxBanner";
import { DemoDrawer } from "./components/DemoDrawer";
import { ToastProvider, useToast } from "./components/Toast";
import { apiClient } from "./api/client";

import { MissionControlPage } from "./pages/MissionControl";
import { NewMandatePage } from "./pages/NewMandate";
import { MandateDetailPage } from "./pages/MandateDetail";
import { AgentRunPage } from "./pages/AgentRun";
import { EvidenceLedgerPage } from "./pages/EvidenceLedger";
import { DisputesPage } from "./pages/Disputes";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5000
    }
  }
});

const AppContent: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [bypassReferee, setBypassReferee] = useState(false);
  const [persona, setPersona] = useState<"Consumer" | "Merchant" | "Auditor">("Consumer");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "d" || e.key === "D") {
        setDrawerOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
  };

  const handleScenarioSelect = async (scenario: string) => {
    showToast(`Launching Scenario ${scenario}...`, "info");
    try {
      const res = await apiClient.runScenario(scenario);
      setDrawerOpen(false);
      queryClient.invalidateQueries();

      if (scenario === "A" || scenario === "B" || scenario === "C") {
        const runId = (res as { runId?: string }).runId;
        if (runId) navigate(`/runs/${runId}`);
      } else if (scenario === "D") {
        navigate("/disputes");
      } else if (scenario === "E") {
        navigate("/ledger");
      }
    } catch {
      showToast(`Error executing scenario ${scenario}`, "error");
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <SandboxBanner />
      <Header
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenDrawer={() => setDrawerOpen(true)}
      />

      <main style={{ flex: 1 }}>
        <Routes>
          <Route path="/" element={<MissionControlPage />} />
          <Route path="/mandates/new" element={<NewMandatePage />} />
          <Route path="/mandates/:id" element={<MandateDetailPage />} />
          <Route path="/runs/:id" element={<AgentRunPage />} />
          <Route path="/ledger" element={<EvidenceLedgerPage />} />
          <Route path="/disputes" element={<DisputesPage />} />
          <Route path="/disputes/:id" element={<DisputesPage />} />
        </Routes>
      </main>

      <DemoDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSelectScenario={handleScenarioSelect}
        bypassReferee={bypassReferee}
        onToggleReferee={() => setBypassReferee((prev) => !prev)}
        persona={persona}
        onChangePersona={setPersona}
      />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
};
