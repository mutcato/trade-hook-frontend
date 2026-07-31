import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useOutletContext } from "react-router-dom";
import {
  deriveStrategyStatus,
  timewindowToMinutes,
  traderApi,
} from "../api";
import { Icon, StatusBadge } from "../components/Icons";

export default function Strategies() {
  const navigate = useNavigate();
  const { search = "" } = useOutletContext() || {};
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [strategies, setStrategies] = useState([]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [hooksets, hooks, trades] = await Promise.all([
        traderApi.listHooksets(),
        traderApi.listHooks(),
        traderApi.listTrades(),
      ]);
      setStrategies(
        (hooksets || []).map((hs) =>
          deriveStrategyStatus(hs, hooks || [], trades || [])
        )
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return strategies;
    return strategies.filter((s) => s.name.toLowerCase().includes(q));
  }, [strategies, search]);

  async function handleDelete(id, name) {
    if (!confirm(`Delete strategy "${name}"? This removes its hooks and trades.`)) {
      return;
    }
    try {
      await traderApi.deleteHookset(id);
      setStrategies((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      alert(err.message);
    }
  }

  if (loading) return <div className="loading">Loading strategies…</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Strategy Management</h1>
          <p>Configure and monitor your automated trading algorithms.</p>
        </div>
        <Link className="btn btn-primary" to="/strategies/new">
          <Icon name="plus" size={16} />
          Create New Strategy
        </Link>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="strategy-grid">
        {filtered.map((s, i) => (
          <article className="strategy-card" key={s.id} style={{ animationDelay: `${i * 40}ms` }}>
            <div className="strategy-card-head">
              <div className={`strategy-icon${i % 2 ? " alt" : ""}`}>
                <Icon name={i % 2 ? "zap" : "strategies"} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem" }}>
                  <h3>
                    <Link to={`/strategies/${s.id}`}>{s.name}</Link>
                  </h3>
                  <StatusBadge
                    status={
                      s.status === "completed" || s.status === "processing"
                        ? "active"
                        : s.hooks.length
                          ? "idle"
                          : "inactive"
                    }
                  />
                </div>
                <p className="muted" style={{ margin: 0, fontSize: "0.82rem" }}>
                  {s.hooks.length} webhook{s.hooks.length === 1 ? "" : "s"} ·{" "}
                  {timewindowToMinutes(s.timewindow)}m window
                </p>
              </div>
            </div>

            <dl className="strategy-stats">
              <div>
                <dt>Asset pairs</dt>
                <dd>{s.pairs.length ? s.pairs.join(", ") : "—"}</dd>
              </div>
              <div>
                <dt>Trades</dt>
                <dd>
                  {s.trades.filter((t) => t.is_triggered).length}/{s.trades.length} fired
                </dd>
              </div>
            </dl>

            <div className="strategy-footer">
              <div className="meta-row">
                {s.trades.slice(0, 3).map((t) => (
                  <span key={t.id} className="badge badge-idle">
                    {t.action}
                  </span>
                ))}
              </div>
              <div className="strategy-actions">
                <button
                  className="icon-btn"
                  type="button"
                  title="Edit"
                  onClick={() => navigate(`/strategies/${s.id}/edit`)}
                >
                  <Icon name="edit" size={16} />
                </button>
                <button
                  className="icon-btn"
                  type="button"
                  title="Delete"
                  onClick={() => handleDelete(s.id, s.name)}
                >
                  <Icon name="trash" size={16} />
                </button>
              </div>
            </div>
          </article>
        ))}

        <button
          type="button"
          className="strategy-card add-template"
          onClick={() => navigate("/strategies/new")}
        >
          <div>
            <div className="plus">+</div>
            <strong>Add strategy</strong>
            <p className="muted" style={{ margin: "0.35rem 0 0", fontSize: "0.85rem" }}>
              Create webhooks and pair actions
            </p>
          </div>
        </button>
      </div>
    </div>
  );
}
