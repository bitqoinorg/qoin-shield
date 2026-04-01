import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppProvider } from "@/contexts/AppContext";
import Landing from "@/pages/Landing";
import GenerateVault from "@/pages/GenerateVault";
import AccessVault from "@/pages/AccessVault";
import NotFound from "@/pages/not-found";
import Problem from "@/pages/why/Problem";
import Solution from "@/pages/why/Solution";
import QuantumThreat from "@/pages/why/QuantumThreat";
import GettingStarted from "@/pages/how/GettingStarted";
import QonjointProtocol from "@/pages/how/QonjointProtocol";
import KeyManagement from "@/pages/how/KeyManagement";
import HackChallenge from "@/pages/proof/HackChallenge";
import LiveBalance from "@/pages/proof/LiveBalance";
import Faq from "@/pages/Faq";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/qoin/create" component={GenerateVault} />
      <Route path="/qoin/open" component={AccessVault} />
      <Route path="/why/problem" component={Problem} />
      <Route path="/why/solution" component={Solution} />
      <Route path="/why/quantum" component={QuantumThreat} />
      <Route path="/how/start" component={GettingStarted} />
      <Route path="/how/protocol" component={QonjointProtocol} />
      <Route path="/how/keys" component={KeyManagement} />
      <Route path="/proof/challenge" component={HackChallenge} />
      <Route path="/proof/balance" component={LiveBalance} />
      <Route path="/faq" component={Faq} />
      <Route component={NotFound} />
    </Switch>
  );
}

const queryClientInstance = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClientInstance}>
      <AppProvider>
        <WouterRouter base="/wallet">
          <Router />
        </WouterRouter>
      </AppProvider>
    </QueryClientProvider>
  );
}
