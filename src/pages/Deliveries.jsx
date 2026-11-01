import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { formatTime, timeAgo, traderApi } from "../api";
import { Icon } from "../components/Icons";

export default function Deliveries() {
  const [rows, setRows] = useState([]);
  const [next, setNext] = useState(null);
  const [failuresOnly, setFailuresOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const load = useCallback(async (only) => {
    const page = await traderApi.listNotificationLogs({ failuresOnly: only });
    setRows(page.results || []);
    setNext(page.next || null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setRefreshing(true);
    setError("");
    load(failuresOnly)
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [failuresOnly, load, reloadKey]);

  async function loadMore() {
    if (!next) return;
    setLoadingMore(true);
    try {
      // Cursor paging: append, never re-fetch from the top, so rows arriving
      // while you read cannot shift what you have already seen.
      const page = await traderApi.listNotificationLogsPage(next);
      setRows((prev) => [...prev, ...(page.results || [])]);
      setNext(page.next || null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingMore(false);
    }
  }

  if (loading && rows.length === 0) {
    return <div className="loading">Loading deliveries…</div>;
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Deliveries</h1>
          <p>
            Every alert this account has tried to send, newest first. A channel
            that keeps failing here is one your strategies are paying for but
            not reaching.
          </p>
        </div>
        <div className="refresh-row">
          <button
            className={`btn btn-sm ${failuresOnly ? "btn-primary" : "btn-secondary"}`}
            type="button"
            aria-pressed={failuresOnly}
            onClick={() => setFailuresOnly((v) => !v)}
          >
            <Icon name="alert" size={14} />
            <span>{failuresOnly ? "Showing failures" : "Failures only"}</span>
          </button>
          {/* This feed does not poll, so without this the only way to see a new
              delivery was a full page reload. */}
          <button
            className="btn btn-secondary btn-sm"
            type="button"
            disabled={refreshing || loadingMore}
            onClick={() => setReloadKey((k) => k + 1)}
          >
            <Icon name="refresh" size={14} />
            <span>{refreshing ? "Refreshing…" : "Refresh"}</span>
          </button>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {rows.length === 0 ? (
        <div className="empty-state">
          <h3>{failuresOnly ? "No failed deliveries" : "No deliveries yet"}</h3>
          <p>
            {failuresOnly
              ? "Every alert so far has reached its channel."
              : "Alerts appear here once one of your strategies completes."}
          </p>
        </div>
      ) : (
        <div className="panel panel-pad">
          <ul className="delivery-list">
            {rows.map((row) => (
              <li
                className={`delivery-item${row.success ? "" : " failed"}`}
                key={row.id}
              >
                <span className="delivery-dot" aria-hidden />
                <div className="delivery-main">
                  <div>
                    <strong>{row.channel || "Deleted channel"}</strong>
                    <span className="muted">
                      {" · "}
                      <Link to={`/strategies/${row.strategy_id}`}>
                        {row.strategy}
                      </Link>
                    </span>
                  </div>
                  {!row.success && (
                    <div className="delivery-error">
                      {row.status_code ? `HTTP ${row.status_code}: ` : ""}
                      {row.error}
                    </div>
                  )}
                </div>
                <div className="delivery-meta">
                  <span className={`badge ${row.success ? "badge-success" : "badge-danger"}`}>
                    {row.success ? "Delivered" : "Failed"}
                  </span>
                  <span className="dim" title={row.created_at}>
                    {timeAgo(row.created_at)}
                  </span>
                  <span className="dim mono">{formatTime(row.created_at)}</span>
                </div>
              </li>
            ))}
          </ul>

          {next && (
            <button
              className="btn btn-secondary btn-block"
              type="button"
              disabled={loadingMore}
              onClick={loadMore}
              style={{ marginTop: "1rem" }}
            >
              {loadingMore ? "Loading…" : "Load older deliveries"}
            </button>
          )}
        </div>
      )}
    </>
  );
}
