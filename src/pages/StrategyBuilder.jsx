import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  billingApi,
  hookTriggerUrl,
  minutesToTimewindow,
  timewindowToMinutes,
  traderApi,
} from "../api";
import { Icon } from "../components/Icons";

let _uid = 0;
const uid = () => `k-${Date.now()}-${++_uid}`;

const emptyHook = () => ({
  key: uid(),
  uuid: null,
  name: "",
});

export default function StrategyBuilder() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const nameInputRef = useRef(null);

  const [loading, setLoading] = useState(isEdit);
  const [name, setName] = useState("");
  const [minutes, setMinutes] = useState(15);
  const [triggerLogic, setTriggerLogic] = useState("all");
  const [hooks, setHooks] = useState(isEdit ? [] : [{ ...emptyHook(), name: "RSI Oversold Alert" }]);
  const [initialHookUuids, setInitialHookUuids] = useState([]);
  const [telegrams, setTelegrams] = useState([]);
  const [telegramBot, setTelegramBot] = useState(null);
  const [selectedTelegramIds, setSelectedTelegramIds] = useState([]);
  const [newTelegramName, setNewTelegramName] = useState("");
  const [newTelegramChatId, setNewTelegramChatId] = useState("");
  const [addingTelegram, setAddingTelegram] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  // null while unknown; creating a strategy needs at least one execution left.
  const [outOfCredits, setOutOfCredits] = useState(false);

  useEffect(() => {
    if (isEdit) return;

    let cancelled = false;
    billingApi
      .getWallet()
      .then((wallet) => {
        if (!cancelled) setOutOfCredits(wallet.total_available === 0);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isEdit]);

  useEffect(() => {
    let cancelled = false;
    traderApi
      .listTelegrams()
      .then((list) => {
        if (!cancelled) setTelegrams(list || []);
      })
      .catch(() => {});
    traderApi
      .getTelegramBotInfo()
      .then((info) => {
        if (!cancelled) setTelegramBot(info);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isEdit) return;

    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const [hookset, allHooks] = await Promise.all([
          traderApi.getHookset(id),
          traderApi.listHooks(),
        ]);
        if (cancelled) return;

        const hsHooks = (allHooks || []).filter((h) => h.hookset === hookset.id);

        setName(hookset.name || "");
        setMinutes(timewindowToMinutes(hookset.timewindow));
        setHooks(
          hsHooks.length
            ? hsHooks.map((h) => ({
                key: `hook-${h.uuid}`,
                uuid: h.uuid,
                name: h.name || "",
              }))
            : [emptyHook()]
        );
        setInitialHookUuids(hsHooks.map((h) => h.uuid));
        setSelectedTelegramIds((hookset.telegrams || []).map((t) => t.id));
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id, isEdit]);

  function addHook() {
    setHooks((prev) => [...prev, emptyHook()]);
  }

  function updateHook(key, value) {
    setHooks((prev) => prev.map((h) => (h.key === key ? { ...h, name: value } : h)));
  }

  function removeHook(key) {
    setHooks((prev) => prev.filter((h) => h.key !== key));
  }

  function toggleTelegram(telegramId) {
    setSelectedTelegramIds((prev) =>
      prev.includes(telegramId)
        ? prev.filter((id) => id !== telegramId)
        : [...prev, telegramId]
    );
  }

  async function addTelegram() {
    if (!newTelegramName.trim() || !newTelegramChatId.trim()) return;
    setAddingTelegram(true);
    setError("");
    try {
      const telegram = await traderApi.createTelegram({
        name: newTelegramName.trim(),
        chat_id: newTelegramChatId.trim(),
      });
      setTelegrams((prev) => [...prev, telegram]);
      setSelectedTelegramIds((prev) => [...prev, telegram.id]);
      setNewTelegramName("");
      setNewTelegramChatId("");
    } catch (err) {
      setError(err.message);
    } finally {
      setAddingTelegram(false);
    }
  }

  function fail(message) {
    setError(message);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSave(e) {
    e?.preventDefault();
    setError("");

    if (!name.trim()) {
      fail("Strategy name is required.");
      return;
    }
    if (!hooks.length) {
      fail("Add at least one webhook.");
      return;
    }
    if (hooks.some((h) => !h.name.trim())) {
      fail("Every webhook needs a name.");
      return;
    }
    if (!selectedTelegramIds.length) {
      fail("Select at least one Telegram alert destination.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        timewindow: minutesToTimewindow(Number(minutes) || 15),
        telegram_ids: selectedTelegramIds,
      };

      if (isEdit) {
        await traderApi.updateHookset(id, payload);

        const keptHookUuids = hooks.filter((h) => h.uuid).map((h) => h.uuid);
        for (const hookUuid of initialHookUuids) {
          if (!keptHookUuids.includes(hookUuid)) {
            await traderApi.deleteHook(hookUuid);
          }
        }
        for (const hook of hooks) {
          if (hook.uuid) {
            await traderApi.updateHook(hook.uuid, { name: hook.name.trim() });
          } else {
            await traderApi.createHook({
              hookset: Number(id),
              name: hook.name.trim(),
            });
          }
        }

        navigate(`/strategies/${id}`);
      } else {
        const hookset = await traderApi.createHookset(payload);

        for (const hook of hooks) {
          await traderApi.createHook({
            hookset: hookset.id,
            name: hook.name.trim(),
          });
        }

        navigate(`/strategies/${hookset.id}`);
      }
    } catch (err) {
      // The server is the authority on the paywall — a balance that ran out
      // after this page loaded still lands here.
      if (err.status === 402) setOutOfCredits(true);
      else fail(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="loading">Loading strategy…</div>;
  }

  if (outOfCredits && !isEdit) {
    return (
      <>
        <Link className="back-link" to="/strategies">
          <Icon name="arrow-left" size={14} />
          Back to strategies
        </Link>
        <div className="page-header">
          <div>
            <h1>Out of credits</h1>
            <p>
              Every strategy execution costs one credit, and your balance is
              empty — a new strategy could not send any alerts.
            </p>
          </div>
        </div>
        <div className="empty-state">
          <h3>Top up to keep building</h3>
          <p>
            Your free executions are used up. Add credits and you can create
            strategies again right away.
          </p>
          <button
            className="btn btn-primary"
            type="button"
            onClick={() => navigate("/credits")}
          >
            <Icon name="coin" size={14} />
            <span>Buy credits</span>
          </button>
        </div>
      </>
    );
  }

  const cancelTo = isEdit ? `/strategies/${id}` : "/strategies";

  return (
    <div className="strategy-editor">
      <Link className="back-link" to={cancelTo}>
        <Icon name="arrow-left" size={16} /> Back to {isEdit ? "Strategy" : "Strategies"}
      </Link>

      <h1 className="strategy-editor-title">
        {isEdit ? "Edit Strategy" : "Create Strategy"}
      </h1>

      {error && <div className="error-banner">{error}</div>}

      <form className="strategy-editor-form" onSubmit={handleSave}>
        <div className="strategy-name-bar">
          <div className="strategy-name-inline">
            <span className="strategy-name-label">Strategy Name:</span>
            <span className="mandatory">MANDATORY</span>
            <button
              type="button"
              className="icon-btn strategy-name-edit"
              title="Edit name"
              onClick={() => nameInputRef.current?.focus()}
            >
              <Icon name="edit" size={14} />
            </button>
            <span className="strategy-name-sep">|</span>
            <input
              ref={nameInputRef}
              className="strategy-name-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Trend Scalper Alpha"
              required
            />
          </div>
        </div>

        {/* Step 1: Webhooks */}
        <section className="editor-card">
          <h2 className="editor-card-title">Define webhook signals</h2>
          <div className="editor-card-body">
            {hooks.map((hook) => (
              <div className="webhook-row" key={hook.key}>
                <div className="webhook-row-top">
                  <input
                    className="editor-input"
                    value={hook.name}
                    placeholder="Webhook name"
                    onChange={(e) => updateHook(hook.key, e.target.value)}
                  />
                  <button
                    className="icon-btn editor-icon-btn"
                    type="button"
                    title="Remove webhook"
                    onClick={() => removeHook(hook.key)}
                    disabled={hooks.length === 1}
                  >
                    <Icon name="trash" size={16} />
                  </button>
                </div>
                {hook.uuid ? (
                  <div className="webhook-row-bottom">
                    <input
                      className="editor-input editor-input-mono"
                      readOnly
                      value={hookTriggerUrl(hook.uuid)}
                    />
                  </div>
                ) : (
                  <p className="editor-hint">
                    Webhook URL is generated after you save this strategy.
                  </p>
                )}
              </div>
            ))}
            <button className="btn btn-outline btn-block" type="button" onClick={addHook}>
              <Icon name="plus" size={14} /> Create Webhook
            </button>
          </div>
        </section>

        {/* Step 2: Trigger Logic */}
        <section className="editor-card">
          <h2 className="editor-card-title">Step 2: Define Trigger Logic</h2>
          <p className="editor-card-sub">Set the conditions for conditional trades.</p>
          <div className="editor-card-body">
            <div className="logic-options">
              <label className={`logic-option${triggerLogic === "all" ? " selected" : ""}`}>
                <input
                  type="radio"
                  name="triggerLogic"
                  value="all"
                  checked={triggerLogic === "all"}
                  onChange={() => setTriggerLogic("all")}
                />
                <span>ALL webhook signals must fire</span>
                <span className="logic-icon logic-icon-all" aria-hidden>
                  <Icon name="link" size={18} />
                </span>
              </label>
              <label className={`logic-option${triggerLogic === "any" ? " selected" : ""}`}>
                <input
                  type="radio"
                  name="triggerLogic"
                  value="any"
                  checked={triggerLogic === "any"}
                  onChange={() => setTriggerLogic("any")}
                />
                <span>ANY webhook signals must fire</span>
                <span className="logic-icon logic-icon-any" aria-hidden>
                  <span className="venn" />
                </span>
              </label>
            </div>

            {triggerLogic === "all" && (
              <div className="timewindow-row">
                <span className="timewindow-label">Maximum Signal Time Window</span>
                <p className="timewindow-inline">
                  All conditions must be met within{" "}
                  <input
                    type="number"
                    min={1}
                    max={1440}
                    className="timewindow-input"
                    value={minutes}
                    onChange={(e) => setMinutes(e.target.value)}
                  />{" "}
                  minutes.
                </p>
              </div>
            )}
            <p className="editor-footnote">
              {triggerLogic === "all"
                ? "All webhooks in this strategy must fire within this window before trades execute."
                : "Any webhook signal triggers execution immediately (UI only — backend currently requires all hooks)."}
              {" "}Mapping: BUY → LONG, SELL → SHORT on the API.
            </p>
          </div>
        </section>

        {/* Step 3: Execution Actions */}
        <section className="editor-card">
          <h2 className="editor-card-title">Step 3: Define Execution Actions</h2>
          <p className="editor-card-sub">
            No trade is placed. When the trigger logic above is met, a Telegram alert is
            sent to the destinations you pick here.
          </p>
          <div className="editor-card-body">
            {telegrams.length === 0 ? (
              <p className="editor-hint">
                No Telegram destinations yet — add one below to get alerts.
              </p>
            ) : (
              <div className="telegram-options">
                {telegrams.map((t) => (
                  <label
                    key={t.id}
                    className={`logic-option${selectedTelegramIds.includes(t.id) ? " selected" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedTelegramIds.includes(t.id)}
                      onChange={() => toggleTelegram(t.id)}
                    />
                    <span>{t.name}</span>
                    <span className="editor-hint" style={{ marginLeft: "auto" }}>
                      chat_id: {t.chat_id}
                    </span>
                  </label>
                ))}
              </div>
            )}

            {telegramBot?.bot_url && (
              <ol className="telegram-steps">
                <li>
                  Open{" "}
                  <a href={telegramBot.bot_url} target="_blank" rel="noreferrer">
                    @{telegramBot.bot_name}
                  </a>{" "}
                  on Telegram.
                </li>
                <li>
                  Send it any message (e.g. <code>/start</code>).
                </li>
                <li>It replies with "Your chat ID is: ...". Copy that number.</li>
                <li>Paste it into "Telegram chat ID" below, give it a name, and click Add Telegram.</li>
              </ol>
            )}

            <div className="telegram-add-row">
              <input
                className="editor-input"
                placeholder="Destination name (e.g. My Phone)"
                value={newTelegramName}
                onChange={(e) => setNewTelegramName(e.target.value)}
              />
              <input
                className="editor-input"
                placeholder="Telegram chat ID"
                value={newTelegramChatId}
                onChange={(e) => setNewTelegramChatId(e.target.value)}
              />
              <button
                className="btn btn-outline"
                type="button"
                onClick={addTelegram}
                disabled={addingTelegram || !newTelegramName.trim() || !newTelegramChatId.trim()}
              >
                <Icon name="plus" size={14} /> {addingTelegram ? "Adding…" : "Add Telegram"}
              </button>
            </div>
          </div>
        </section>

        <div className="editor-footer">
          <button className="btn btn-primary btn-lg" type="submit" disabled={saving}>
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Save Strategy"}
          </button>
          <Link className="btn btn-secondary btn-lg" to={cancelTo}>
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
