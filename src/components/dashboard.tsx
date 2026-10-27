"use client";
import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowDownToLine,
  ArrowRight,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  ExternalLink,
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
  statuses,
  type LabCase,
  type Mail,
} from "@/lib/domain";

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

function Dialog({
  children,
  title,
  close,
}: {
  children: React.ReactNode;
  title: string;
  close: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClick={(e) => {
        if (e.target === ref.current) close();
      }}
      aria-labelledby="dialog-title"
    >
      <div className="dialog-heading">
        <h2 id="dialog-title">{title}</h2>
        <button
          className="icon-button"
          onClick={close}
          aria-label="Close dialog"
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
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
  const [selected, setSelected] = useState<LabCase | null>(null);
  const [message, setMessage] = useState<Mail | null>(null);
  const [date, setDate] = useState("");
  const [simulateFailure, setSimulateFailure] = useState(false);
  const [updatedCase, setUpdatedCase] = useState<string | null>(null);
  const dueDateInput = useRef<HTMLInputElement>(null);
  async function load() {
    setError("");
    try {
      const response = await fetch("/api/workspace", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setData(body);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load cases.");
    }
  }
  useEffect(() => {
    void load();
  }, []);
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
      <div className="main-shell">
        <header className="topbar">
          <div className="header-inner">
            <a href="/" className="brand" aria-label="LabTrack home">
              LabTrack
            </a>
            <nav aria-label="Main navigation">
              <button
                className={view === "cases" ? "nav-item active" : "nav-item"}
                onClick={() => switchView("cases")}
              >
                Cases
              </button>
              <button
                className={view === "outbox" ? "nav-item active" : "nav-item"}
                onClick={() => switchView("outbox")}
              >
                Clinic messages{" "}
                {pending.length > 0 && (
                  <span className="nav-count">{pending.length}</span>
                )}
              </button>
            </nav>
            <span className="lab-name">Studio Dental Lab</span>
            <span className="demo-pill">Demo</span>
          </div>
        </header>
        <main id="main-content">
          <div className="page-heading">
            <div>
              <h1>
                {view === "cases"
                  ? "Cases"
                  : view === "outbox"
                    ? "Clinic messages"
                    : "Demo notes"}
              </h1>
              <p className="heading-description">
                {view === "cases"
                  ? "Track production and agreed delivery dates."
                  : view === "outbox"
                    ? "Ready-case notification emails."
                    : "What is included, and how to test it."}
              </p>
            </div>
            <div className="today-label">
              {data ? formatDate(data.today, "long") : "Loading…"}
              <small>Lab day · Kolkata</small>
            </div>
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
              <LoaderCircle className="spin" size={25} />
              <p>Loading cases…</p>
            </div>
          )}
          {view === "cases" && data && (
            <>
              <section className="case-panel" aria-label="Case list">
                <div className="filter-row">
                  <div className="tabs" aria-label="Filter cases">
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
                        aria-label="Search cases"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search case, clinic or restoration"
                      />
                    </label>
                    <label className="clinic-select">
                      <select
                        aria-label="Filter by clinic"
                        value={clinic}
                        onChange={(e) => setClinic(e.target.value)}
                      >
                        <option value="all">All clinics</option>
                        {Array.from(new Set(cases.map((c) => c.clinic))).map(
                          (c) => (
                            <option key={c}>{c}</option>
                          ),
                        )}
                      </select>
                      <ChevronDown size={13} />
                    </label>
                  </div>
                </div>
                <div
                  className="table-scroll"
                  tabIndex={0}
                  role="region"
                  aria-label="Cases. Scroll horizontally on smaller screens."
                >
                  <table>
                    <thead>
                      <tr>
                        <th>Case</th>
                        <th>Clinic</th>
                        <th>Restoration</th>
                        <th>
                          Due date <ArrowDown size={12} />{" "}
                          <span title="Calendar date, unchanged across time zones">
                            ⓘ
                          </span>
                        </th>
                        <th>Status</th>
                        <th>
                          <span className="sr-only">Action</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((c) => {
                        const overdue =
                          c.status !== "ready" && c.due_date < data.today;
                        const mail = messages.find((m) => m.case_id === c.id);
                        return (
                          <tr
                            key={c.id}
                            className={
                              updatedCase === c.id ? "row-updated" : undefined
                            }
                          >
                            <td>
                              <button
                                className="case-id"
                                onClick={() => openCase(c)}
                              >
                                {c.code}
                              </button>
                              <small>{c.reference}</small>
                            </td>
                            <td>
                              <div className="clinic-cell">
                                <span>
                                  <strong>{c.clinic}</strong>
                                  <small>
                                    {c.country}{" "}
                                    <span className="dot-separator">·</span>{" "}
                                    {zoneNames[c.clinic_timezone] ||
                                      "Stockholm"}
                                  </small>
                                </span>
                              </div>
                            </td>
                            <td>
                              <span className="treatment">{c.treatment}</span>
                              <small>
                                Tooth {c.teeth}
                                {c.priority === "rush" && (
                                  <span className="rush-tag">Rush</span>
                                )}
                              </small>
                            </td>
                            <td>
                              <span
                                className={`due-date ${overdue ? "overdue" : ""}`}
                              >
                                {formatDate(c.due_date)}{" "}
                                {c.due_date.slice(0, 4)}
                                {overdue && <span className="overdue-dot" />}
                              </span>
                              {(overdue ||
                                updatedCase === c.id ||
                                (c.due_date === data.today &&
                                  c.status !== "ready")) && (
                                <small className={overdue ? "overdue" : ""}>
                                  {overdue
                                    ? "Overdue"
                                    : updatedCase === c.id
                                      ? "Date updated"
                                      : "Today"}
                                </small>
                              )}
                            </td>
                            <td>
                              <span
                                className={`status-badge status-${c.status}`}
                              >
                                <span />
                                {statuses[c.status]}
                              </span>
                              {mail && mail.status !== "captured" && (
                                <small className="overdue">
                                  Email needs retry
                                </small>
                              )}
                            </td>
                            <td>
                              <button
                                className="row-action"
                                onClick={() => openCase(c)}
                                aria-label={`Open ${c.code}`}
                              >
                                Open <ChevronRight size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
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
                <div className="table-footer">
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
                          className="icon-button"
                          onClick={() => setMessage(m)}
                          aria-label={`Preview email for ${m.case_code}`}
                        >
                          <ExternalLink size={17} />
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
              <button
                onClick={() => switchView(view === "guide" ? "cases" : "guide")}
              >
                {view === "guide" ? "Back to cases" : "Demo notes"}
              </button>
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
            <span className={`status-badge status-${currentCase.status}`}>
              <span />
              {statuses[currentCase.status]}
            </span>
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
