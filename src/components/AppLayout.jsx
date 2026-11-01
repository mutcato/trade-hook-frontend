import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

/* Ordered: /strategies/new has to match before /strategies/:id. */
const ROUTES = [
  [/^\/$/, { title: "Dashboard", search: "Search strategies or pairs…" }],
  [/^\/strategies\/new$/, { title: "New strategy" }],
  [/^\/strategies\/[^/]+\/edit$/, { title: "Edit strategy" }],
  [/^\/strategies\/[^/]+$/, { title: "Strategy" }],
  [/^\/strategies$/, { title: "Strategies", search: "Search strategies…" }],
  [/^\/credits$/, { title: "Credits" }],
  [/^\/deliveries$/, { title: "Deliveries" }],
  [/^\/settings$/, { title: "Settings" }],
];

function routeInfo(pathname) {
  const hit = ROUTES.find(([pattern]) => pattern.test(pathname));
  return hit ? hit[1] : {};
}

export default function AppLayout() {
  const { pathname } = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { title, search: searchPlaceholder } = routeInfo(pathname);

  useEffect(() => {
    document.title = title ? `${title} · NudgeWire` : "NudgeWire Terminal";
  }, [title]);

  // Closing on navigation keeps the mobile drawer from covering the page you
  // just asked for.
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // The box only filters the page it belongs to, so a query left behind on a
  // page without one would silently narrow the next list you open.
  useEffect(() => {
    if (!searchPlaceholder) setSearch("");
  }, [searchPlaceholder]);

  return (
    <div className="app-shell">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-column">
        <TopBar
          search={search}
          onSearch={setSearch}
          searchPlaceholder={searchPlaceholder}
          onMenu={() => setSidebarOpen(true)}
        />
        <main className="content">
          <Outlet context={{ search }} />
        </main>
      </div>
    </div>
  );
}
