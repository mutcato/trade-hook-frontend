import { useEffect, useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import {
  deriveStrategyStatus,
  formatTime,
  timewindowToMinutes,
  traderApi,
} from "../api";
import { Icon, StatusBadge } from "../components/Icons";

function hookProgress(hooks, timewindow) {
  if (!hooks.length) return 0;
  const triggered = hooks.filter((h) => h.is_triggered).length;
  return Math.round((triggered / hooks.length) * 100);
}

function ExecutionCard({ strategy }) {
  const minutes = timewindowToMinutes(strategy.timewindow);
  const progress = hookProgress(strategy.hooks);
  const pairLabel = strategy.pairs[0] || "—";
  const deadChannels = (strategy.channels || []).filter((c) => !c.is_healthy);

  return (
    <article className={`execution-card status-${strategy.status}`}>
      <div className="execution-head">
        <div>
          <h3>
            <Link to={`/strategies/${strategy.id}`}>{strategy.name}</Link>
          </h3>
          <div className="meta-row">
            <span>{pairLabel}</span>
            <span>{strategy.trades.length} trade{strategy.trades.length === 1 ? "" : "s"}</span>
            <span>Window {minutes}m</span>
          </div>
        </div>
        <StatusBadge
          status={
            strategy.status === "idle"
              ? "active"
              : strategy.status === "inactive"
                ? "inactive"
                : strategy.status
          }
        />
      </div>

      <div className="label-caps">Webhook logic</div>
      <div className="logic-list">
        {strategy.hooks.length === 0 && (
          <div className="logic-item">No webhooks attached</div>
        )}
        {strategy.hooks.map((hook) => (
          <div
            key={hook.uuid}
            className={`logic-item${hook.is_triggered ? " done" : ""}`}
          >
            <span className="check">{hook.is_triggered ? "✓" : ""}</span>
            <span>{hook.name || `Hook #${hook.uuid}`}</span>
            {hook.triggered_at && (
              <span className="dim mono" style={{ marginLeft: "auto" }}>
                {formatTime(hook.triggered_at)}
              </span>
            )}
          </div>
        ))}
      </div>

      {strategy.status === "processing" && (
        <div className="window-row">
          <span>Signal window</span>
          <div className="progress">
            <span style={{ width: `${Math.max(progress, 8)}%` }} />
          </div>
          <span className="mono">{progress}%</span>
        </div>
      )}

      {strategy.status === "completed" && (
        <div className="meta-row" style={{ marginTop: "0.75rem" }}>
          <span className="badge badge-success">Trades fired</span>
          {strategy.trades.map((t) => (
            <span key={t.id} className="mono">
              {t.action} {t.pair}
            </span>
          ))}
        </div>
      )}

      {deadChannels.length > 0 && (
        <div className="channel-warning">
          <Icon name="alert" size={14} />
          <span>
            {deadChannels.length === 1
              ? `Alerts are not reaching "${deadChannels[0].name}"`
              : `Alerts are not reaching ${deadChannels.length} channels`}
            {" — "}
            <Link to="/deliveries">check delivery</Link>
          </span>
        </div>
      )}

      {strategy.status === "idle" && strategy.hooks.length > 0 && (
        <p className="muted" style={{ margin: "0.5rem 0 0", fontSize: "0.85rem" }}>
          Waiting for first webhook signal within the {minutes}m window.
        </p>
      )}
    </article>
  );
}

function buildStream(strategies) {
  const events = [];
  for (const s of strategies) {
    for (const h of s.hooks) {
      if (h.is_triggered && h.triggered_at) {
        events.push({
          id: `hook-${h.uuid}`,
          strategy: s.name,
          type: "SIGNAL RECEIVED",
          at: h.triggered_at,
          message: `Webhook "${h.name || h.uuid}" triggered successfully.`,
        });
      }
    }
    for (const c of s.channels || []) {
      // A partial delivery still costs a full credit, so a channel that stopped
      // working has to be visible or it goes unnoticed while the owner pays.
      if (!c.is_healthy && c.last_error_at) {
        events.push({
          id: `channel-${c.id}`,
          strategy: s.name,
          type: "DELIVERY FAILED",
          at: c.last_error_at,
          failed: true,
          message: `"${c.name}" has failed ${c.failure_count} time${
            c.failure_count === 1 ? "" : "s"
          } in a row — ${
            c.last_status_code ? `HTTP ${c.last_status_code}: ` : ""
          }${c.last_error}`,
        });
      }
    }
    for (const t of s.trades) {
      if (t.is_triggered && t.triggered_at) {
        events.push({
          id: `trade-${t.id}`,
          strategy: s.name,
          type: "TRADE EXECUTED",
          at: t.triggered_at,
          message: `${t.action} ${t.pair} (${t.name}) marked triggered.`,
        });
      }
    }
  }
  return events.sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 40);
}

export default function Dashboard() {
  const { search = "" } = useOutletContext() || {};
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [strategies, setStrategies] = useState([]);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  // Bumping this re-runs the effect, which reloads and restarts the poll clock,
  // so a manual refresh does not land right before an automatic one.
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setRefreshing(true);
      setError("");
      try {
        const [hooksets, hooks, trades] = await Promise.all([
          traderApi.listHooksets(),
          traderApi.listHooks(),
          traderApi.listTrades(),
        ]);
        if (cancelled) return;
        const list = (hooksets || []).map((hs) =>
          deriveStrategyStatus(hs, hooks || [], trades || [])
        );
        setStrategies(list);
        setUpdatedAt(new Date().toISOString());
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    }
    load();
    const id = setInterval(load, 15000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [reloadKey]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return strategies;
    return strategies.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.pairs.some((p) => p.toLowerCase().includes(q))
    );
  }, [strategies, search]);

  const stream = useMemo(() => buildStream(filtered), [filtered]);

  if (loading && !strategies.length) {
    return <div className="loading">Loading execution status…</div>;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Strategy Execution Status</h1>
          <p>Live view of webhook signals and trade triggers across your strategies.</p>
        </div>
        <div className="refresh-row">
          {/* The LIVE pill alone never said how old the numbers were. */}
          <span className="freshness">
            {refreshing
              ? "Refreshing…"
              : updatedAt
                ? `Updated ${formatTime(updatedAt)}`
                : ""}
          </span>
          <button
            className="btn btn-secondary btn-sm"
            type="button"
            disabled={refreshing}
            onClick={() => setReloadKey((k) => k + 1)}
          >
            <Icon name="refresh" size={14} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          {strategies.length
            ? `Live updates stopped — showing the last state received. ${error}`
            : error}
        </div>
      )}

      <div className="dashboard-grid">
        <section>
          <div className="section-title">
            <h2>Active strategies</h2>
            <span className="muted" style={{ fontSize: "0.8rem" }}>
              {filtered.length} total
            </span>
          </div>
          {filtered.length === 0 ? (
            <div className="empty-state">
              <h3>No strategies yet</h3>
              <p>Create a strategy to start receiving TradingView webhooks.</p>
              <Link className="btn btn-primary" to="/strategies/new" style={{ marginTop: "1rem" }}>
                Create strategy
              </Link>
            </div>
          ) : (
            <div className="execution-list">
              {filtered.map((s) => (
                <ExecutionCard key={s.id} strategy={s} />
              ))}
            </div>
          )}
        </section>

        <aside className="panel panel-pad stream-panel">
          <div className="section-title">
            <h2>Webhook stream</h2>
            <span className="live-pill">LIVE</span>
          </div>
          {stream.length === 0 ? (
            <p className="muted" style={{ fontSize: "0.85rem" }}>
              Trigger events will appear here once hooks or trades fire.
            </p>
          ) : (
            <div className="stream-list">
              {stream.map((ev) => (
                <div
                  className={`stream-item${ev.failed ? " failed" : ""}`}
                  key={ev.id}
                >
                  <header>
                    <strong>{ev.strategy}</strong>
                    <span className="label-caps">Strategy target</span>
                  </header>
                  <div className="event">
                    <strong>{ev.type}</strong>
                    <span className="mono">{formatTime(ev.at)}</span>
                    <div>{ev.message}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
