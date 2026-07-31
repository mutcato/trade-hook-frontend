import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Icon } from "./Icons";

export default function TopBar({ search, onSearch, onMenu, searchPlaceholder }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const initials = `${user?.first_name?.[0] || ""}${user?.last_name?.[0] || ""}`.toUpperCase() ||
    user?.email?.[0]?.toUpperCase() ||
    "?";

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
        <button className="icon-btn" type="button" aria-label="Notifications">
          <Icon name="bell" />
        </button>
        <button
          className="btn btn-primary btn-sm"
          type="button"
          onClick={() => navigate("/strategies/new")}
        >
          <Icon name="zap" size={14} />
          <span>Execute Strategy</span>
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
