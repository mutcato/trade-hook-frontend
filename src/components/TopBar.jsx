import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { billingApi } from "../api";
import { useAuth } from "../context/AuthContext";
import { Icon } from "./Icons";

export default function TopBar({ search, onSearch, onMenu, searchPlaceholder }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [wallet, setWallet] = useState(null);

  // Re-read on navigation so the chip is current after a top-up round trip.
  // The cancelled guard keeps a slow response from a previous route from
  // overwriting a newer one.
  useEffect(() => {
    let cancelled = false;
    billingApi
      .getWallet()
      .then((data) => {
        if (!cancelled) setWallet(data);
      })
      .catch(() => {
        if (!cancelled) setWallet(null);
      });
    return () => {
      cancelled = true;
    };
  }, [pathname]);
  const initials = `${user?.first_name?.[0] || ""}${user?.last_name?.[0] || ""}`.toUpperCase() ||
    user?.email?.[0]?.toUpperCase() ||
    "?";

  // The chip shows free + paid summed, so the label names both parts to keep
  // that number reconcilable — and says what to do when there is nothing left.
  const creditLabel =
    wallet?.total_available === 0
      ? "Out of execution credits — click to top up"
      : `${wallet?.free_executions_remaining ?? 0} free + ${wallet?.balance ?? 0} paid executions left`;

  return (
    <header className="topbar">
      <button className="mobile-toggle" onClick={onMenu} aria-label="Open menu">
        <Icon name="menu" />
      </button>
      <div className="topbar-title">AlphaBot Terminal</div>

      <div className="search-wrap">
        <Icon name="search" />
        <input
          type="search"
          placeholder={searchPlaceholder || "Search strategies..."}
          value={search}
          onChange={(e) => onSearch?.(e.target.value)}
        />
      </div>

      <div className="topbar-actions">
        {wallet && (
          <button
            className={`credit-chip${wallet.total_available === 0 ? " empty" : ""}`}
            type="button"
            onClick={() => navigate("/credits")}
            title={creditLabel}
            aria-label={creditLabel}
          >
            <Icon name="coin" size={14} />
            <span>{wallet.total_available}</span>
          </button>
        )}
        <button className="icon-btn" type="button" aria-label="Notifications">
          <Icon name="bell" />
        </button>
        <button
          className="btn btn-primary btn-sm"
          type="button"
          onClick={() => navigate("/strategies/new")}
        >
          <Icon name="zap" size={14} />
          <span>Create Strategy</span>
        </button>
        <button
          className="avatar"
          type="button"
          onClick={() => navigate("/settings")}
          title={user?.email}
          aria-label="Account"
        >
          {initials}
        </button>
      </div>
    </header>
  );
}
