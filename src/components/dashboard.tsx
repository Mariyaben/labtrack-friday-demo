"use client";
import { useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  CircleHelp,
  Layers3,
  LayoutGrid,
  RefreshCw,
  ArrowDownToLine,
  ArrowRight,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  FlaskConical,
  LoaderCircle,
  Mail as MailIcon,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import {
  eml,
  formatDate,
  LAB_TIMEZONE,
  type LabCase,
  type Mail,
} from "@/lib/domain";

import { Dialog } from "./ui/dialog";
import { CaseTable } from "./case-table";
import { CaseStatusLabel } from "./case-status";

type Data = {
  cases: LabCase[];
  messages: Mail[];
  today: string;
  emailMode: "capture";
};
type View = "cases" | "outbox" | "guide";
type Filter = "active" | "all" | "attention" | "today" | "ready";
const zones = [
  "Asia/Kolkata",
  "Europe/London",
  "America/Los_Angeles",
  "Australia/Sydney",
  "Pacific/Kiritimati",
];
const zoneNames: Record<string, string> = {
  "Asia/Kolkata": "Kolkata",
  "Europe/London": "London",
  "America/Los_Angeles": "Los Angeles",
  "Australia/Sydney": "Sydney",
  "Pacific/Kiritimati": "Kiritimati",
};

export default function Dashboard() {
  const [data, setData] = useState<Data | null>(null);
  const [view, setView] = useState<View>("cases");
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [clinic, setClinic] = useState("all");
  const [zone, setZone] = useState(LAB_TIMEZONE);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const searchInput = useRef<HTMLInputElement>(null);
  const filterNav = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<LabCase | null>(null);
  const [message, setMessage] = useState<Mail | null>(null);
  const [date, setDate] = useState("");
  const [simulateFailure, setSimulateFailure] = useState(false);
  const [updatedCase, setUpdatedCase] = useState<string | null>(null);
  const dueDateInput = useRef<HTMLInputElement>(null);
  async function load() {
    setRefreshing(true);
    setError("");
    try {
      const response = await fetch("/api/workspace", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setData(body);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load cases.");
    } finally {
      setRefreshing(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  useEffect(() => {
    const nav = filterNav.current;
    if (!nav) return;
    function revealActiveFilter() {
      const active = nav!.querySelector<HTMLButtonElement>(
        'button[aria-pressed="true"]',
      );
      if (!active) return;
      const left = active.offsetLeft;
      const right = left + active.offsetWidth;
      if (left < nav!.scrollLeft)
        nav!.scrollTo({ left: Math.max(0, left - 8) });
      else if (right > nav!.scrollLeft + nav!.clientWidth)
        nav!.scrollTo({ left: right - nav!.clientWidth + 8 });
    }
    revealActiveFilter();
    const observer = new ResizeObserver(revealActiveFilter);
    observer.observe(nav);
    return () => observer.disconnect();
  }, [filter, view, data !== null]);
  useEffect(() => {
    function focusSearch(event: KeyboardEvent) {
      const target = event.target;
      if (
        view !== "cases" ||
        event.key !== "/" ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        document.querySelector("dialog[open]")
      )
        return;
      if (
        target instanceof HTMLElement &&
        target.closest('input, textarea, select, [contenteditable="true"]')
      )
        return;
      event.preventDefault();
      searchInput.current?.focus();
    }
    document.addEventListener("keydown", focusSearch);
    return () => document.removeEventListener("keydown", focusSearch);
  }, [view]);
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(""), 5500);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  async function mutate(body: object, success: string) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/workspace", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-LabTrack-Request": "1",
        },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setData(result);
      if ("action" in body && body.action === "due-date") {
        setFilter("all");
        setUpdatedCase("caseId" in body ? String(body.caseId) : null);
      }
      setSelected(null);
      setToast(success);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save changes.");
      return false;
    } finally {
      setBusy(false);
    }
  }
  const cases = data?.cases || [];
  const messages = data?.messages || [];
  const attention = cases.filter(
    (c) => c.status !== "ready" && c.due_date < data!.today,
  );
  const dueToday = cases.filter(
    (c) => c.status !== "ready" && c.due_date === data!.today,
  );
  const ready = cases.filter((c) => c.status === "ready");
  const pending = messages.filter((m) => m.status !== "captured");
  const filtered = cases.filter(
    (c) =>
      (filter === "all" ||
        (filter === "active" && c.status !== "ready") ||
        (filter === "attention" && attention.includes(c)) ||
        (filter === "today" && dueToday.includes(c)) ||
        (filter === "ready" && c.status === "ready")) &&
      (clinic === "all" || c.clinic === clinic) &&
      `${c.code} ${c.clinic} ${c.treatment} ${c.reference}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const currentCase = selected && cases.find((c) => c.id === selected.id);
  const currentMail =
    currentCase && messages.find((m) => m.case_id === currentCase.id);
  function openCase(c: LabCase) {
    setError("");
    setSelected(c);
    setDate(c.due_date);
    setSimulateFailure(false);
  }
  function switchView(next: View) {
    setView(next);
    setError("");
  }
  function download(mail: Mail) {
    const url = URL.createObjectURL(
      new Blob([eml(mail)], { type: "message/rfc822" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${mail.case_code}.eml`;
    anchor.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to case workspace
      </a>
      <aside className="sidebar">
        <a href="/" className="brand" aria-label="LabTrack home">
          <span className="brand-symbol">
            <Layers3 size={21} strokeWidth={1.6} />
          </span>
          LabTrack
        </a>
        <div className="sidebar-workspace">
          <span className="workspace-caption">DENTAL LAB</span>
          <strong>Studio Dental Lab</strong>
          <span className="workspace-location">Kolkata, India</span>
        </div>
        <div className="nav-section-label">Workspace</div>
        <nav aria-label="Main navigation">
          <button
            className={view === "cases" ? "nav-item active" : "nav-item"}
            aria-label="Cases"
            aria-current={view === "cases" ? "page" : undefined}
            onClick={() => switchView("cases")}
          >
            <LayoutGrid size={17} />
            <span className="nav-text">Cases</span>
            <span className="nav-count">{cases.length || "—"}</span>
          </button>
          <button
            className={view === "outbox" ? "nav-item active" : "nav-item"}
            aria-label="Clinic messages"
            aria-current={view === "outbox" ? "page" : undefined}
            onClick={() => switchView("outbox")}
          >
            <MailIcon size={17} />
            <span className="nav-text">Clinic messages</span>
            {pending.length > 0 && (
              <span className="nav-count pending-count">{pending.length}</span>
            )}
          </button>
        </nav>
        {data && cases.some((c) => c.status !== "ready") && (
          <section className="sidebar-queue" aria-label="Next due cases">
            <h2>Next due</h2>
            {cases
              .filter((c) => c.status !== "ready")
              .slice(0, 2)
              .map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    switchView("cases");
                    openCase(c);
                  }}
                  aria-label={`Open next due case ${c.code}`}
                >
                  <span className="queue-case">
                    {c.code}
                    <span
                      className={
                        c.due_date < data.today
                          ? "queue-date late"
                          : "queue-date"
                      }
                    >
                      {c.due_date < data.today
                        ? "Overdue"
                        : c.due_date === data.today
                          ? "Today"
                          : formatDate(c.due_date)}
                    </span>
                  </span>
                  <span className="queue-clinic">{c.clinic}</span>
                </button>
              ))}
          </section>
        )}
        <div className="sidebar-bottom">
          <button
            className={view === "guide" ? "nav-item active" : "nav-item"}
            aria-label="Demo notes"
            aria-current={view === "guide" ? "page" : undefined}
            onClick={() => switchView("guide")}
          >
            <CircleHelp size={17} />
            <span className="nav-text">Demo notes</span>
          </button>
          <div className="sidebar-footnote">
            LabTrack <span>Friday demo</span>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="header-inner">
            <div className="breadcrumb">
              <span>Workspace</span>
              <ChevronRight size={12} />
              <strong>
                {view === "cases"
                  ? "Cases"
                  : view === "outbox"
                    ? "Clinic messages"
                    : "Demo notes"}
              </strong>
            </div>
            <div className="header-date">
              <CalendarDays size={14} />
              {data ? formatDate(data.today, "long") : "Loading…"}
              <span>· Kolkata</span>
            </div>
            <span className="demo-pill">Demo workspace</span>
          </div>
        </header>
        <main id="main-content" tabIndex={-1}>
          <div className="page-heading">
            <div>
              <div className="title-row">
                <h1>
                  {view === "cases"
                    ? "Cases"
                    : view === "outbox"
                      ? "Clinic messages"
                      : "Demo notes"}
                </h1>
                {view === "cases" && data && (
                  <span
                    className="page-total"
                    aria-label={`${cases.length} total cases`}
                  >
                    {cases.length}
                  </span>
                )}
              </div>
              <p className="heading-description">
                {view === "cases"
                  ? `Production queue · ${new Set(cases.map((c) => c.clinic)).size} clinics`
                  : view === "outbox"
                    ? "Ready-case notification emails."
                    : "What is included, and how to test it."}
              </p>
            </div>
            <button
              className="refresh-button"
              disabled={refreshing}
              onClick={() => void load()}
            >
              <RefreshCw
                size={14}
                className={refreshing ? "spin" : undefined}
              />
              {refreshing ? "Refreshing…" : "Refresh"}
            </button>
          </div>
          {error && (
            <div className="error-banner" role="alert">
              <span>{error}</span>
              <button className="text-button" onClick={() => void load()}>
                Refresh cases
              </button>
            </div>
          )}
          {!data && !error && (
            <div className="loading-state">
              <span className="sr-only" role="status">
                Loading your cases…
              </span>
              <div className="loading-lines" aria-hidden="true">
                {[0, 1, 2].map((i) => (
                  <div key={i}>
                    <span />
                    <span />
                    <span />
                  </div>
                ))}
              </div>
            </div>
          )}
          {view === "cases" && data && (
            <>
              <section
                className="case-panel"
                aria-label="Case list"
                aria-busy={refreshing}
              >
                <div className="filter-row">
                  <div
                    ref={filterNav}
                    className="tabs"
                    aria-label="Filter cases"
                  >
                    {(
                      [
                        ["all", "All cases", cases.length],
                        ["active", "In the lab", cases.length - ready.length],
                        ["attention", "Overdue", attention.length],
                        ["today", "Due today", dueToday.length],
                        ["ready", "Ready", ready.length],
                      ] as const
                    ).map(([key, label, count]) => (
                      <button
                        key={key}
                        className={filter === key ? "tab active-tab" : "tab"}
                        aria-pressed={filter === key}
                        onClick={() => setFilter(key as Filter)}
                      >
                        {label}
                        <span
                          className={
                            key === "attention" && count > 0
                              ? "filter-count overdue-count"
                              : "filter-count"
                          }
                        >
                          {count}
                        </span>
                      </button>
                    ))}
                  </div>
                  <div className="list-controls">
                    <label className="search">
                      <Search size={15} />
                      <input
                        ref={searchInput}
                        aria-label="Search cases"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search cases, clinics or restorations"
                        onKeyDown={(event) => {
                          if (event.key === "Escape") setQuery("");
                        }}
                      />
                      <kbd aria-hidden="true">/</kbd>
                    </label>
                    <label className="clinic-select">
                      <span className="clinic-filter-label">Clinic</span>
                      <select
                        aria-label="Filter by clinic"
                        value={clinic}
                        onChange={(e) => setClinic(e.target.value)}
                      >
                        <option value="all">All clinics</option>
                        {Array.from(new Set(cases.map((c) => c.clinic)))
                          .sort()
                          .map((c) => (
                            <option key={c}>{c}</option>
                          ))}
                      </select>
                      <ChevronDown size={13} />
                    </label>
                  </div>
                </div>
                <CaseTable
                  cases={filtered}
                  messages={messages}
                  today={data.today}
                  updatedCase={updatedCase}
                  selectedCaseId={selected?.id}
                  onOpen={openCase}
                />
                {filtered.length === 0 && (
                  <div className="empty-state">
                    <Search size={25} />
                    <h3>No cases in this view</h3>
                    <p>Try a different search or filter.</p>
                    <button
                      className="secondary-button"
                      onClick={() => {
                        setFilter("all");
                        setQuery("");
                        setClinic("all");
                      }}
                    >
                      Clear filters
                    </button>
                  </div>
                )}
                <div
                  className="table-footer"
                  role="status"
                  aria-live="polite"
                  aria-atomic="true"
                >
                  <span>
                    Showing {filtered.length} of {cases.length} cases
                  </span>
                  <span>Sorted by due date</span>
                </div>
              </section>
            </>
          )}
          {view === "outbox" && data && (
            <section className="case-panel outbox-panel">
              <div className="panel-heading">
                <div>
                  <h2>
                    Test outbox{" "}
                    <span>
                      {messages.length}{" "}
                      {messages.length === 1 ? "message" : "messages"}
                    </span>
                  </h2>
                  <p>
                    Captured in this demo’s database. No email leaves the app.
                  </p>
                </div>
                <span className="capture-badge">
                  <FlaskConical size={14} />
                  Capture mode
                </span>
              </div>
              {messages.length === 0 ? (
                <div className="empty-state large-empty">
                  <MailIcon size={35} />
                  <h3>No messages yet</h3>
                  <p>
                    Open a case and mark it ready to capture the clinic’s email.
                  </p>
                  <button
                    className="primary-button"
                    onClick={() => switchView("cases")}
                  >
                    Go to cases <ArrowRight size={15} />
                  </button>
                </div>
              ) : (
                <div className="message-list">
                  {messages.map((m) => (
                    <article className="message-row" key={m.id}>
                      <div className="message-summary">
                        <button onClick={() => setMessage(m)}>
                          {m.subject}
                        </button>
                        <p>To: {m.recipient}</p>
                        <small>
                          {m.case_code} · {m.attempts}{" "}
                          {m.attempts === 1 ? "attempt" : "attempts"} ·{" "}
                          {new Intl.DateTimeFormat("en-GB", {
                            timeZone: zone,
                            dateStyle: "medium",
                            timeStyle: "short",
                          }).format(new Date(m.created_at))}{" "}
                          ({zoneNames[zone]})
                        </small>
                        {m.last_error && (
                          <p className="overdue">{m.last_error}</p>
                        )}
                      </div>
                      <span className={`mail-badge mail-${m.status}`}>
                        {m.status === "captured"
                          ? "Captured · test"
                          : m.status === "pending"
                            ? "Pending"
                            : "Failed"}
                      </span>
                      {m.status !== "captured" ? (
                        <button
                          className="secondary-button"
                          disabled={busy}
                          onClick={() =>
                            void mutate(
                              { action: "retry", caseId: m.case_id },
                              "Email captured. No duplicate was created.",
                            )
                          }
                        >
                          Retry email
                        </button>
                      ) : (
                        <button
                          className="secondary-button"
                          onClick={() => setMessage(m)}
                          aria-label={`Preview email for ${m.case_code}`}
                        >
                          Preview <ChevronRight size={13} />
                        </button>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}
          {view === "guide" && (
            <div className="guide-grid">
              <section className="case-panel guide-card">
                <span className="guide-number">01</span>
                <h2>Due dates</h2>
                <p>
                  A case due on 30 October is due on 30 October in every
                  country. Dates are stored as calendar dates. Changing the
                  viewing location never shifts them.
                </p>
                <p>
                  “Today” and “overdue” follow the lab’s day in Kolkata. Email
                  timestamps are actual moments and use the selected viewing
                  location.
                </p>
              </section>
              <section className="case-panel guide-card">
                <span className="guide-number">02</span>
                <h2>Ready notifications</h2>
                <p>
                  Open any case, then mark it ready. The case change and email
                  request are saved together. Repeated clicks create one
                  message.
                </p>
                <p>
                  To try recovery, enable “Simulate an email failure” before
                  marking a case ready, then retry from Clinic messages. The
                  case stays ready.
                </p>
              </section>
              <section className="case-panel guide-card">
                <span className="guide-number">03</span>
                <h2>Included in this demo</h2>
                <p>
                  Search, filter and edit due dates. Work from the most urgent
                  cases to the next. Preview and download the captured email.
                </p>
                <p>
                  WhatsApp, real email delivery, staff accounts and patient data
                  are outside this demo. All cases and clinic addresses are
                  fictional.
                </p>
              </section>
              <section className="case-panel guide-card">
                <span className="guide-number">04</span>
                <h2>Demo data</h2>
                <p>
                  A private browser cookie identifies your fictional dataset.
                  Your edits persist when you refresh and won’t change another
                  visitor’s demo.
                </p>
                <p>
                  This is demo isolation, not staff authentication. No real
                  patient information should be entered here.
                </p>
              </section>
            </div>
          )}
          <footer className="page-footer">
            <div className="footer-notes">
              <span>Fictional cases · Test email only</span>
            </div>
            <label className="timezone-select">
              <span>Viewing time zone</span>
              <select
                aria-label="Viewing time zone"
                value={zone}
                onChange={(e) => {
                  setZone(e.target.value);
                  setToast(
                    `Viewing from ${zoneNames[e.target.value]}. Calendar due dates stay the same.`,
                  );
                }}
              >
                {zones.map((z) => (
                  <option key={z} value={z}>
                    {zoneNames[z]} · {z}
                  </option>
                ))}
              </select>
              <ChevronDown size={13} />
            </label>
          </footer>
        </main>
      </div>
      {toast && (
        <div className="toast" role="status">
          <span>
            <Check size={17} />
          </span>
          {toast}
          <button
            className="icon-button"
            onClick={() => setToast("")}
            aria-label="Dismiss message"
          >
            <X size={15} />
          </button>
        </div>
      )}
      {selected && currentCase && (
        <Dialog
          title={currentCase.code}
          close={() => !busy && setSelected(null)}
        >
          <div className="case-dialog-subtitle">
            <span>
              {currentCase.treatment} · Tooth {currentCase.teeth}
            </span>
            <CaseStatusLabel status={currentCase.status} />
          </div>
          <div className="detail-block">
            <span className="detail-label">CLINIC</span>
            <strong>{currentCase.clinic}</strong>
            <p>{currentCase.clinic_email}</p>
            <small>
              {currentCase.country} · {currentCase.clinic_timezone}
            </small>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              // Read the submitted native input, independently of draft state.
              const submittedDate = String(
                new FormData(e.currentTarget).get("dueDate") || "",
              );
              void mutate(
                {
                  action: "due-date",
                  caseId: currentCase.id,
                  dueDate: submittedDate,
                  version: currentCase.version,
                },
                `${currentCase.code}: due date saved as ${formatDate(submittedDate, "long")}.`,
              );
            }}
          >
            <label className="field-label" htmlFor="due-date">
              Agreed due date
            </label>
            <div className="date-edit">
              <input
                ref={dueDateInput}
                id="due-date"
                name="dueDate"
                type="date"
                required
                min="2000-01-01"
                max="2100-12-31"
                defaultValue={currentCase.due_date}
                onInput={(e) => setDate(e.currentTarget.value)}
                onChange={(e) => setDate(e.currentTarget.value)}
              />
              <button
                className="secondary-button"
                type="submit"
                disabled={busy}
              >
                Save date
              </button>
            </div>
            <p className="field-hint">
              <ShieldCheck size={13} />
              {date !== currentCase.due_date
                ? "Unsaved change. Select Save date to apply it."
                : "Select a date, then Save date. It stays the same for every clinic."}
            </p>
          </form>
          <div className="ready-section">
            <h3>
              {currentCase.status === "ready"
                ? "Ready for collection"
                : "Complete this case"}
            </h3>
            <p>
              {currentCase.status === "ready"
                ? currentMail?.status === "captured"
                  ? "The clinic’s email is captured in your test outbox."
                  : "The case is ready. The email can be retried from Clinic messages."
                : "Mark this case ready and we’ll capture an email for the clinic. No message will be sent externally."}
            </p>
            {currentCase.status !== "ready" ? (
              <>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={simulateFailure}
                    onChange={(e) => setSimulateFailure(e.target.checked)}
                  />
                  Simulate an email failure
                </label>
                <button
                  className="primary-button full-width"
                  disabled={busy || date !== currentCase.due_date}
                  onClick={() => {
                    if (dueDateInput.current?.value !== currentCase.due_date) {
                      setError(
                        "Save the new due date before marking this case ready.",
                      );
                      return;
                    }
                    void mutate(
                      {
                        action: "ready",
                        caseId: currentCase.id,
                        simulateFailure,
                      },
                      simulateFailure
                        ? `${currentCase.code} is ready. Email failed; retry in Clinic messages.`
                        : `${currentCase.code} is ready. Clinic email captured.`,
                    );
                  }}
                >
                  {busy ? (
                    <LoaderCircle size={17} className="spin" />
                  ) : (
                    <CheckCheck size={17} />
                  )}
                  Mark ready & prepare email
                </button>
              </>
            ) : (
              <button
                className="primary-button full-width"
                onClick={() => {
                  setSelected(null);
                  switchView("outbox");
                }}
              >
                View clinic message <ArrowRight size={16} />
              </button>
            )}
          </div>
          {error && (
            <p className="dialog-error" role="alert">
              {error}
            </p>
          )}
        </Dialog>
      )}
      {message && (
        <Dialog title="Clinic email preview" close={() => setMessage(null)}>
          <div className="email-meta">
            <span className="capture-badge">
              <FlaskConical size={13} />
              Test email · {message.status}
            </span>
            <p>
              <span>To</span>
              {message.recipient}
            </p>
            <p>
              <span>Subject</span>
              {message.subject}
            </p>
          </div>
          <pre className="email-body">{message.body}</pre>
          <button
            className="secondary-button full-width"
            onClick={() => download(message)}
          >
            <ArrowDownToLine size={16} />
            Download email (.eml)
          </button>
        </Dialog>
      )}
    </div>
  );
}
