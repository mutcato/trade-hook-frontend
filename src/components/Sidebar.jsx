import { NavLink } from "react-router-dom";
import { Icon } from "./Icons";

const links = [
  { to: "/", label: "Dashboard", icon: "dashboard", end: true },
  { to: "/strategies", label: "Strategies", icon: "strategies" },
  { to: "/settings", label: "Settings", icon: "settings" },
];

export default function Sidebar({ open, onClose }) {
  return (
    <>
      <div
        className={`sidebar-backdrop${open ? " open" : ""}`}
        onClick={onClose}
        aria-hidden
      />
      <aside className={`sidebar${open ? " open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">A</div>
          <div className="brand-text">
            <span className="brand-name">AlphaBot</span>
            <span className="brand-tag">Vigilant Trader</span>
          </div>
        </div>

        <nav className="nav-list">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
              onClick={onClose}
            >
              <Icon name={link.icon} />
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="nav-footer">
          <a
            className="nav-link"
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
          >
            <Icon name="docs" />
            Documentation
          </a>
          <a className="nav-link" href="mailto:support@example.com">
            <Icon name="support" />
            Support
          </a>
        </div>
      </aside>
    </>
  );
}
