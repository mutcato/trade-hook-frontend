import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  deriveStrategyStatus,
  formatTime,
  hookTriggerUrl,
  timeAgo,
  timewindowToMinutes,
  traderApi,
} from "../api";
import { Icon, StatusBadge } from "../components/Icons";

export default function StrategyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [strategy, setStrategy] = useState(null);
  const [copied, setCopied] = useState(null);
  const [triggering, setTriggering] = useState(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [hookset, hooks, trades] = await Promise.all([
        traderApi.getHookset(id),
        traderApi.listHooks(),
        traderApi.listTrades(),
      ]);
      setStrategy(deriveStrategyStatus(hookset, hooks || [], trades || []));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  async function copyUrl(hookId) {
    const url = hookTriggerUrl(hookId);
    await navigator.clipboard.writeText(url);
    setCopied(hookId);
    setTimeout(() => setCopied(null), 1500);
  }

  async function handleTrigger(hookId) {
    setTriggering(hookId);
    try {
      await traderApi.triggerHook(hookId);
      await load();
    } catch (err) {
      alert(err.message);
    } finally {
      setTriggering(null);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete strategy "${strategy.name}"?`)) return;
    try {
      await traderApi.deleteHookset(strategy.id);
      navigate("/strategies");
    } catch (err) {
      alert(err.message);
    }
  }

  if (loading) return <div className="loading">Loading strategy…</div>;
  if (error) {
    return (
      <div>
        <div className="error-banner">{error}</div>
        <Link className="btn btn-secondary" to="/strategies">
          Back
        </Link>
      </div>
    );
  }
  if (!strategy) return null;

  const minutes = timewindowToMinutes(strategy.timewindow);

  return (
    <div className="detail-grid">
      <Link className="back-link" to="/strategies">
        <Icon name="arrow-left" size={16} /> Back to Strategies
      </Link>

      <div className="page-header">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
            <h1 style={{ marginBottom: 0 }}>{strategy.name}</h1>
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
          <p>Webhook endpoints for this strategy.</p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <Link className="btn btn-secondary" to={`/strategies/${id}/edit`}>
            <Icon name="edit" size={14} />
            Edit
          </Link>
          <button className="btn btn-danger" type="button" onClick={handleDelete}>
            <Icon name="trash" size={14} />
            Delete
          </button>
        </div>
      </div>

      <div className="panel panel-pad">
        <div className="detail-meta">
          <div>
            <span>Time window</span>
            <strong>{minutes} minutes</strong>
          </div>
          <div>
            <span>Webhooks</span>
            <strong>
              {strategy.hooks.filter((h) => h.is_triggered).length}/{strategy.hooks.length}{" "}
              triggered
            </strong>
          </div>
          <div>
            <span>Updated</span>
            <strong>{timeAgo(strategy.updated_at)}</strong>
          </div>
        </div>
      </div>

      <section className="step">
        <div className="step-head">
          <div className="step-label">
            <span className="step-num">1</span>
            WEBHOOKS
          </div>
        </div>
        <div className="step-body">
          {strategy.hooks.length === 0 && (
            <div className="empty-hint">No webhooks on this strategy.</div>
          )}
          {strategy.hooks.map((hook) => {
            const url = hookTriggerUrl(hook.uuid);
            return (
              <div className="webhook-card" key={hook.uuid}>
                <header>
                  <div>
                    <h4>{hook.name || `Hook #${hook.uuid}`}</h4>
                    <span className="dim mono">id · {hook.uuid}</span>
                  </div>
                  <StatusBadge status={hook.is_triggered ? "completed" : "idle"} />
                </header>
                <div className="label-caps" style={{ marginBottom: "0.35rem" }}>
                  TradingView webhook URL
                </div>
                <div className="url-row">
                  <input readOnly value={url} />
                  <button
                    className="icon-btn"
                    type="button"
                    title="Copy"
                    onClick={() => copyUrl(hook.uuid)}
                  >
                    <Icon name="copy" size={16} />
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    type="button"
                    disabled={triggering === hook.uuid}
                    onClick={() => handleTrigger(hook.uuid)}
                  >
                    {triggering === hook.uuid ? "…" : "Trigger"}
                  </button>
                </div>
                {copied === hook.uuid && (
                  <p className="muted" style={{ margin: "0.4rem 0 0", fontSize: "0.8rem" }}>
                    Copied to clipboard
                  </p>
                )}
                {hook.triggered_at && (
                  <p className="dim" style={{ margin: "0.4rem 0 0", fontSize: "0.8rem" }}>
                    Last trigger {formatTime(hook.triggered_at)}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
