import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { billingApi, formatDate, formatUsd } from "../api";
import { Icon } from "../components/Icons";

/** Crypto settles in minutes, not instantly — poll this long before giving up. */
const POLL_INTERVAL_MS = 5000;
const POLL_TIMEOUT_MS = 180000;

const REASON_LABELS = {
  purchase: "Top-up",
  execution: "Execution",
  free_execution: "Execution (free tier)",
  adjustment: "Adjustment",
};

export default function Credits() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [wallet, setWallet] = useState(null);
  const [packs, setPacks] = useState([]);
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [buying, setBuying] = useState(null);
  const [awaitingPayment, setAwaitingPayment] = useState(false);
  // The underpaid order, when a payment came in short of its invoice.
  const [shortfall, setShortfall] = useState(null);
  const pollTimer = useRef(null);

  const returnedOrder = searchParams.get("order");
  const returnedStatus = searchParams.get("status");

  const load = useCallback(async () => {
    const [walletData, packData, ledgerData] = await Promise.all([
      billingApi.getWallet(),
      billingApi.listPacks(),
      billingApi.listLedger(),
    ]);
    setWallet(walletData);
    setPacks(packData);
    setLedger(ledgerData);
  }, []);

  useEffect(() => {
    load()
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [load]);

  // Coming back from the provider, the IPN may not have landed yet, so poll the
  // order until it is credited rather than showing a stale balance.
  useEffect(() => {
    if (returnedStatus !== "success" || !returnedOrder) return;

    setAwaitingPayment(true);
    const startedAt = Date.now();
    // Without this, a request in flight when the page unmounts would schedule
    // the next timer after the cleanup already ran, and polling would continue.
    let cancelled = false;

    const poll = async () => {
      try {
        const order = await billingApi.getOrder(returnedOrder);
        if (cancelled) return;
        // Checked before credited_at: an underpaid order has credits granted
        // too, and the shortfall is the part the customer needs told about.
        if (order.status === "partially_paid") {
          setAwaitingPayment(false);
          setShortfall(order);
          await load();
          return;
        }
        if (order.credited_at) {
          setAwaitingPayment(false);
          await load();
          return;
        }
        if (["failed", "expired", "refunded"].includes(order.status)) {
          setAwaitingPayment(false);
          setError(`Payment ${order.status}. No credits were added.`);
          return;
        }
      } catch {
        // A transient read failure shouldn't end the wait — keep polling.
      }

      if (cancelled) return;
      if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
        setAwaitingPayment(false);
        return;
      }
      pollTimer.current = setTimeout(poll, POLL_INTERVAL_MS);
    };

    poll();
    return () => {
      cancelled = true;
      clearTimeout(pollTimer.current);
    };
  }, [returnedOrder, returnedStatus, load]);

  async function buy(pack) {
    setBuying(pack.id);
    setError("");
    try {
      const order = await billingApi.createOrder(pack.id);
      if (!order.invoice_url) throw new Error("The provider did not return a payment page.");
      // Hosted invoice: every coin and network choice stays on their page.
      window.location.href = order.invoice_url;
    } catch (err) {
      setError(err.message);
      setBuying(null);
    }
  }

  function dismissReturnBanner() {
    setShortfall(null);
    const next = new URLSearchParams(searchParams);
    next.delete("order");
    next.delete("status");
    setSearchParams(next, { replace: true });
  }

  if (loading) return <div className="loading">Loading…</div>;

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Credits</h1>
          <p>
            Each strategy execution costs one credit. Top up with crypto — the
            balance updates as soon as the payment confirms on-chain.
          </p>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {awaitingPayment && (
        <div className="success-banner">
          Waiting for the payment to confirm on-chain. This usually takes a few
          minutes — you can leave this page, your credits will be added either way.
        </div>
      )}

      {shortfall && (
        <div className="error-banner">
          <strong>
            Payment came in short — {shortfall.credits_granted} of{" "}
            {shortfall.credits} credits added.
          </strong>{" "}
          We received {shortfall.actually_paid} of {shortfall.pay_amount}{" "}
          {shortfall.pay_currency?.toUpperCase()}. The usual cause is an exchange
          withdrawal fee being taken out of the amount sent. Sending the
          difference to the same invoice releases the remaining credits.{" "}
          <button className="btn btn-ghost btn-sm" onClick={dismissReturnBanner}>
            Dismiss
          </button>
        </div>
      )}

      {returnedStatus === "cancelled" && (
        <div className="error-banner">
          Payment cancelled — no credits were added.{" "}
          <button className="btn btn-ghost btn-sm" onClick={dismissReturnBanner}>
            Dismiss
          </button>
        </div>
      )}

      <div className="balance-hero panel panel-pad">
        <div className="balance-main">
          <span className="label-caps">Executions available</span>
          <strong>{wallet?.total_available ?? 0}</strong>
        </div>
        <dl className="balance-breakdown">
          <div>
            <dt>Free tier left</dt>
            <dd>
              {wallet?.free_executions_remaining ?? 0}
              <span className="muted"> / {wallet?.free_quota ?? 0}</span>
            </dd>
          </div>
          <div>
            <dt>Paid credits</dt>
            <dd>{wallet?.balance ?? 0}</dd>
          </div>
        </dl>
        {wallet?.total_available === 0 && (
          <div className="balance-warning">
            <Icon name="alert" size={14} />
            <span>
              You're out of credits — completed strategies will not send alerts
              until you top up.
            </span>
          </div>
        )}
      </div>

      <div className="section-title">
        <h2>Top up</h2>
      </div>
      <p className="muted pay-hint">
        <Icon name="alert" size={14} />
        Paying from an exchange? Withdrawal fees are taken out of the amount you
        send, so withdraw the invoice amount <strong>plus the network fee</strong>{" "}
        — otherwise the payment arrives short. Low-fee networks like USDT on TRON
        are the safest choice.
      </p>
      <div className="pack-grid">
        {packs.map((pack) => (
          <div className="pack-card panel panel-pad" key={pack.id}>
            {pack.discount_percent > 0 && (
              <span className="badge badge-success pack-discount">
                Save {pack.discount_percent}%
              </span>
            )}
            <div className="pack-credits">
              <strong>{pack.credits}</strong>
              <span className="label-caps">credits</span>
            </div>
            <div className="pack-price">{formatUsd(pack.price_usd)}</div>
            <div className="pack-unit muted">
              {formatUsd(pack.unit_price_usd)} per execution
            </div>
            <button
              className="btn btn-primary btn-block"
              type="button"
              disabled={buying !== null}
              onClick={() => buy(pack)}
            >
              {buying === pack.id ? "Opening…" : "Pay with crypto"}
            </button>
          </div>
        ))}
      </div>

      <div className="section-title">
        <h2>History</h2>
      </div>
      <div className="panel panel-pad">
        {ledger.length === 0 ? (
          <div className="empty-state">
            <h3>No activity yet</h3>
            <p>Credit top-ups and executions will show up here.</p>
          </div>
        ) : (
          <ul className="ledger-list">
            {ledger.map((entry) => (
              <li className="ledger-item" key={entry.id}>
                <div>
                  <span className="ledger-reason">
                    {REASON_LABELS[entry.reason] || entry.reason}
                  </span>
                  {entry.hookset_name && (
                    <span className="muted"> · {entry.hookset_name}</span>
                  )}
                </div>
                <div className="ledger-meta">
                  <span
                    className={`ledger-delta${entry.delta > 0 ? " positive" : entry.delta < 0 ? " negative" : ""}`}
                  >
                    {entry.delta > 0 ? `+${entry.delta}` : entry.delta || "free"}
                  </span>
                  <span className="dim">{formatDate(entry.created_at)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
