import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState("");

  return (
    <div className="app-shell">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-column">
        <TopBar
          search={search}
          onSearch={setSearch}
          onMenu={() => setSidebarOpen(true)}
        />
        <main className="content">
          <Outlet context={{ search }} />
        </main>
      </div>
    </div>
  );
}
