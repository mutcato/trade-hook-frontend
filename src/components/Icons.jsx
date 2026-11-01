export function Icon({ name, size = 18 }) {
  const props = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.75",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };

  switch (name) {
    case "dashboard":
      return (
        <svg {...props}>
          <rect x="3" y="3" width="7" height="9" rx="1.5" />
          <rect x="14" y="3" width="7" height="5" rx="1.5" />
          <rect x="14" y="12" width="7" height="9" rx="1.5" />
          <rect x="3" y="16" width="7" height="5" rx="1.5" />
        </svg>
      );
    case "strategies":
      return (
        <svg {...props}>
          <path d="M4 19V5" />
          <path d="M4 19h16" />
          <path d="M8 15l3-4 3 2 4-6" />
        </svg>
      );
    case "settings":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4" />
        </svg>
      );
    case "docs":
      return (
        <svg {...props}>
          <path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
          <path d="M14 3v5h5M9 13h6M9 17h6" />
        </svg>
      );
    case "support":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="9" />
          <path d="M9.5 9.5a2.5 2.5 0 0 1 5 1c0 1.5-2.5 2-2.5 3.5" />
          <path d="M12 17h.01" />
        </svg>
      );
    case "search":
      return (
        <svg {...props}>
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
      );
    case "bell":
      return (
        <svg {...props}>
          <path d="M6 9a6 6 0 0 1 12 0c0 7 3 7 3 7H3s3 0 3-7" />
          <path d="M10 19a2 2 0 0 0 4 0" />
        </svg>
      );
    case "menu":
      return (
        <svg {...props}>
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      );
    case "plus":
      return (
        <svg {...props}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      );
    case "copy":
      return (
        <svg {...props}>
          <rect x="8" y="8" width="12" height="12" rx="2" />
          <path d="M4 16V6a2 2 0 0 1 2-2h10" />
        </svg>
      );
    case "trash":
      return (
        <svg {...props}>
          <path d="M4 7h16M9 7V5h6v2M8 7l1 12h6l1-12" />
        </svg>
      );
    case "edit":
      return (
        <svg {...props}>
          <path d="M4 20h4l10-10-4-4L4 16v4z" />
          <path d="M12 6l4 4" />
        </svg>
      );
    case "play":
      return (
        <svg {...props}>
          <path d="M8 5v14l11-7z" fill="currentColor" stroke="none" />
        </svg>
      );
    case "arrow-left":
      return (
        <svg {...props}>
          <path d="M15 6l-6 6 6 6" />
        </svg>
      );
    case "zap":
      return (
        <svg {...props}>
          <path d="M13 2L4 14h7l-1 8 10-14h-7l0-6z" />
        </svg>
      );
    case "check":
      return (
        <svg {...props}>
          <path d="M5 12l4 4L19 6" />
        </svg>
      );
    case "alert":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v4M12 16h.01" />
        </svg>
      );
    case "link":
      return (
        <svg {...props}>
          <path d="M10 13a3 3 0 0 0 4.2 0l2-2a3 3 0 0 0-4.2-4.2l-1 1" />
          <path d="M14 11a3 3 0 0 0-4.2 0l-2 2a3 3 0 0 0 4.2 4.2l1-1" />
        </svg>
      );
    case "coin":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="9" />
          <path d="M14.5 9.5a2.5 2.5 0 1 0 0 5" />
        </svg>
      );
    case "eye":
      return (
        <svg {...props}>
          <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
    case "eye-off":
      return (
        <svg {...props}>
          <path d="M3 3l18 18" />
          <path d="M10.6 6.1A9.6 9.6 0 0 1 12 6c6 0 9.5 6 9.5 6a17 17 0 0 1-2.4 3.2" />
          <path d="M6.3 7.8A16.8 16.8 0 0 0 2.5 12S6 18 12 18a9.3 9.3 0 0 0 3.6-.7" />
          <path d="M9.9 10.1a3 3 0 0 0 4.1 4.2" />
        </svg>
      );
    case "refresh":
      return (
        <svg {...props}>
          <path d="M20 11a8 8 0 1 0-2.3 5.7" />
          <path d="M20 4.5V11h-6" />
        </svg>
      );
    default:
      return null;
  }
}

export function StatusBadge({ status }) {
  const map = {
    completed: { cls: "badge-success", label: "Completed" },
    processing: { cls: "badge-processing", label: "Processing" },
    failed: { cls: "badge-danger", label: "Failed" },
    inactive: { cls: "badge-idle", label: "Inactive" },
    idle: { cls: "badge-idle", label: "Idle" },
    active: { cls: "badge-success", label: "Active" },
  };
  const item = map[status] || map.idle;
  return (
    <span className={`badge ${item.cls}`}>
      <span className="badge-dot" />
      {item.label}
    </span>
  );
}
