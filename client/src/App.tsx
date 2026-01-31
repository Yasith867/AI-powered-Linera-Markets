import { useState, useEffect } from "react";
import { Route, Switch } from "wouter";
import Header from "./components/Header";
import Dashboard from "./pages/Dashboard";
import Markets from "./pages/Markets";
import MarketDetail from "./pages/MarketDetail";
import Oracles from "./pages/Oracles";
import Bots from "./pages/Bots";
import Analytics from "./pages/Analytics";
import Demo from "./pages/Demo";
import { useWebSocket } from "./hooks/useWebSocket";

export default function App() {
  const { messages, isConnected } = useWebSocket();
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.type === "market_created" || lastMessage.type === "ai_market_created") {
        setNotification("New market created!");
        setTimeout(() => setNotification(null), 3000);
      } else if (lastMessage.type === "trade") {
        setNotification("New trade executed!");
        setTimeout(() => setNotification(null), 2000);
      } else if (lastMessage.type === "market_resolved") {
        setNotification("Market resolved!");
        setTimeout(() => setNotification(null), 3000);
      }
    }
  }, [messages]);

  return (
    <div className="min-h-screen">
      <Header isConnected={isConnected} />
      
      {notification && (
        <div className="fixed top-20 right-4 z-50 bg-green-500/90 text-white px-4 py-2 rounded-lg shadow-lg animate-pulse">
          {notification}
        </div>
      )}

      <main className="container mx-auto px-4 py-6">
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/demo" component={Demo} />
          <Route path="/markets" component={Markets} />
          <Route path="/markets/:id" component={MarketDetail} />
          <Route path="/oracles" component={Oracles} />
          <Route path="/bots" component={Bots} />
          <Route path="/analytics" component={Analytics} />
        </Switch>
      </main>
    </div>
  );
}
