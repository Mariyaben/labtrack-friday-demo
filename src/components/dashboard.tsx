"use client";
import { useEffect, useRef, useState } from "react";
import {
  Activity,
  ArrowDown,
  ArrowDownToLine,
  ArrowRight,
  Bell,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clock3,
  ExternalLink,
  FlaskConical,
  Globe2,
  Inbox,
  LayoutGrid,
  LoaderCircle,
  Mail as MailIcon,
  Search,
  ShieldCheck,
  Stethoscope,
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
      <aside className="sidebar">
        <a className="brand" href="/" aria-label="LabTrack home">
          <span className="brand-mark">
            <Activity size={25} strokeWidth={2.7} />
          </span>
          labtrack<span className="brand-dot">.</span>
        </a>
        <div className="workspace-label">
          <span className="lab-avatar">
            <Stethoscope size={18} />
          </span>
          <span>
            <strong>Studio Dental Lab</strong>
            <small>Lab workspace</small>
          </span>
          <ChevronDown size={14} />
        </div>
        <p className="nav-caption">WORKSPACE</p>
        <nav aria-label="Main navigation">
          <button
            className={view === "cases" ? "nav-item active" : "nav-item"}
            onClick={() => switchView("cases")}
          >
            <LayoutGrid size={18} />
            Case overview
            <span className="nav-count">{cases.length || "—"}</span>
          </button>
          <button
            className={view === "outbox" ? "nav-item active" : "nav-item"}
            onClick={() => switchView("outbox")}
          >
            <MailIcon size={18} />
            Clinic messages
            {pending.length > 0 && (
              <span className="nav-count warning-count">{pending.length}</span>
            )}
          </button>
        </nav>

        <div className="sidebar-bottom">
          <button
            className={view === "guide" ? "nav-item active" : "nav-item"}
            onClick={() => switchView("guide")}
          >
            <CircleHelp size={18} />
            Demo guide
          </button>
          <div className="profile">
            <span className="profile-avatar">M</span>
            <span>
              <strong>Maria</strong>
              <small>Lab owner · demo</small>
            </span>
            <span className="online-dot" />
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <ChevronRight size={13} />
            <span>
              {view === "cases"
                ? "Case overview"
                : view === "outbox"
                  ? "Clinic messages"
                  : "Demo guide"}
            </span>
          </div>
          <div className="topbar-right">
            <span className="demo-pill">
              <span />
              Demo workspace
            </span>
            <button
              className="icon-button notification-button"
              aria-label="Open clinic messages"
              onClick={() => switchView("outbox")}
            >
              <Bell size={19} />
              {pending.length > 0 && <span />}
            </button>
            <span className="topbar-avatar">M</span>
          </div>
        </header>
        <main id="main-content">
          <div className="page-heading">
            <div>
              <p className="eyebrow">A CLEARER DAY IN THE LAB</p>
              <h1>
                {view === "cases"
                  ? "Your cases, at a glance."
                  : view === "outbox"
                    ? "Keep clinics in the loop."
                    : "Small details. Better days."}
              </h1>
              <p className="heading-description">
                {view === "cases"
                  ? "Your cases, your next steps. All in one calm place."
                  : view === "outbox"
                    ? "Ready-case emails, with a clear record of every message."
                    : "A quick guide to the Friday demo and the decisions behind it."}
              </p>
            </div>
            <div className="today-label">
              <CalendarDays size={17} />
              {data ? formatDate(data.today, "long") : "Loading today…"}
              <small>Lab day · Kolkata</small>
            </div>
          </div>
          <div className="demo-banner">
            <FlaskConical size={17} />
            <span>
              <strong>Made for a test drive.</strong> Fictional cases, your own
              workspace. Emails stay in the test outbox.
            </span>
            <button onClick={() => switchView("guide")}>
              How it works <ArrowRight size={14} />
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
              <LoaderCircle className="spin" size={25} />
              <p>Getting your workbench ready…</p>
            </div>
          )}
          {view === "cases" && data && (
            <>
              <section className="stats-grid" aria-label="Case summary">
                {[
                  {
                    label: "Active cases",
                    count: cases.length - ready.length,
                    icon: <Inbox size={19} />,
                    detail: "Moving through the lab",
                    choice: "active",
                    color: "neutral",
                  },
                  {
                    label: "Need attention",
                    count: attention.length,
                    icon: <Clock3 size={19} />,
                    detail: "Past the agreed due date",
                    choice: "attention",
                    color: "orange",
                  },
                  {
                    label: "Due today",
                    count: dueToday.length,
                    icon: <CalendarDays size={19} />,
                    detail: "A little focus for today",
                    choice: "today",
                    color: "purple",
                  },
                  {
                    label: "Ready for collection",
                    count: ready.length,
                    icon: <CheckCheck size={19} />,
                    detail: "Good to go. Clinics in the loop.",
                    choice: "ready",
                    color: "green",
                  },
                ].map((s) => (
                  <button
                    key={s.label}
                    className={`stat-card ${s.color} ${filter === s.choice ? "stat-selected" : ""}`}
                    onClick={() => setFilter(s.choice as Filter)}
                  >
                    <span className="stat-top">
                      {s.label}
                      <span className="stat-icon">{s.icon}</span>
                    </span>
                    <strong>{s.count.toString().padStart(2, "0")}</strong>
                    <span className="stat-detail">{s.detail}</span>
                  </button>
                ))}
              </section>
              <section className="case-panel" aria-labelledby="cases-heading">
                <div className="panel-heading">
                  <div>
                    <h2 id="cases-heading">
                      Your workbench <span>{cases.length} cases</span>
                    </h2>
                    <p>
                      {filter === "active"
                        ? "Unfinished cases, ordered by agreed due date."
                        : "The next right thing, without the noise."}
                    </p>
                  </div>
                  <div className="date-promise">
                    <ShieldCheck size={15} />
                    Same due date. Everywhere.
                  </div>
                </div>
                <div className="filter-row">
                  <div className="tabs" aria-label="Filter cases">
                    {[
                      ["all", "All cases"],
                      ["attention", "Needs attention"],
                      ["today", "Due today"],
                      ["ready", "Ready"],
                    ].map(([key, label]) => (
                      <button
                        key={key}
                        className={filter === key ? "tab active-tab" : "tab"}
                        onClick={() => setFilter(key as Filter)}
                      >
                        {label}
                        {key === "attention" && attention.length > 0 && (
                          <span className="tab-dot" />
                        )}
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
                        placeholder="Search cases…"
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
                        <th>
                          CASE <ArrowDown size={12} />
                        </th>
                        <th>CLINIC</th>
                        <th>RESTORATION</th>
                        <th>
                          DUE DATE{" "}
                          <span title="Calendar date, unchanged across time zones">
                            ⓘ
                          </span>
                        </th>
                        <th>STATUS</th>
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
                          <tr key={c.id}>
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
                                <span
                                  className={`clinic-avatar clinic-${c.country.toLowerCase()}`}
                                >
                                  {c.clinic
                                    .split(" ")
                                    .filter((w) => w !== "The")
                                    .slice(0, 2)
                                    .map((w) => w[0])
                                    .join("")}
                                </span>
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
                                {formatDate(c.due_date)}
                                {overdue && <span className="overdue-dot" />}
                              </span>
                              <small className={overdue ? "overdue" : ""}>
                                {overdue
                                  ? "Overdue"
                                  : c.due_date === data.today
                                    ? "Today"
                                    : c.due_date > data.today
                                      ? "Upcoming"
                                      : "Completed"}
                              </small>
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
                                <ChevronRight size={17} />
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
                  <span>
                    <span className="green-dot" />
                    Saved in your demo workspace
                  </span>
                </div>
              </section>
              <div className="bottom-grid">
                <section className="timezone-card">
                  <span className="feature-icon">
                    <Globe2 size={21} />
                  </span>
                  <div>
                    <h3>Across borders. On the same page.</h3>
                    <p>
                      Switch your viewing location. Every case keeps its agreed
                      due date.
                    </p>
                    <label className="timezone-select">
                      <Globe2 size={13} />
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
                    <small className="timezone-explanation">
                      Overdue and “today” use the lab’s day in Kolkata.
                    </small>
                  </div>
                  <ShieldCheck
                    className="timezone-art"
                    size={62}
                    strokeWidth={1}
                  />
                </section>
                <section className="ready-card">
                  <span className="feature-icon warm">
                    <MailIcon size={21} />
                  </span>
                  <div>
                    <h3>Ready means they’ll know.</h3>
                    <p>
                      Mark a case ready. We’ll prepare the clinic’s email and
                      keep a record.
                    </p>
                    <button
                      className="text-button"
                      onClick={() => switchView("outbox")}
                    >
                      View test outbox <ArrowRight size={14} />
                    </button>
                  </div>
                </section>
              </div>
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
                  <h3>A quieter inbox starts here.</h3>
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
                      <span
                        className={`message-icon ${m.status === "failed" ? "failed-icon" : ""}`}
                      >
                        <MailIcon size={20} />
                      </span>
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
                <h2>A date you can trust</h2>
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
                <h2>One ready case. One email.</h2>
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
                <h2>A focused Friday demo</h2>
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
                <h2>Your own test drive</h2>
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
            <span>
              <Activity size={14} />
              Crafted for a calmer workflow.
            </span>
            <span>
              LabTrack <span className="footer-dot">·</span> Friday demo
            </span>
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
              void mutate(
                {
                  action: "due-date",
                  caseId: currentCase.id,
                  dueDate: date,
                  version: currentCase.version,
                },
                "Due date saved. The same calendar date in every country.",
              );
            }}
          >
            <label className="field-label" htmlFor="due-date">
              Agreed due date
            </label>
            <div className="date-edit">
              <input
                id="due-date"
                type="date"
                required
                min="2000-01-01"
                max="2100-12-31"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
              <button
                className="secondary-button"
                type="submit"
                disabled={busy || date === currentCase.due_date}
              >
                Save date
              </button>
            </div>
            <p className="field-hint">
              <ShieldCheck size={13} />
              Calendar date · unchanged across time zones
            </p>
          </form>
          <div className="ready-section">
            <h3>
              {currentCase.status === "ready"
                ? "Ready for collection"
                : "Finished in the lab?"}
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
                  Simulate an email failure <span>Test recovery</span>
                </label>
                <button
                  className="primary-button full-width"
                  disabled={busy || date !== currentCase.due_date}
                  onClick={() =>
                    void mutate(
                      {
                        action: "ready",
                        caseId: currentCase.id,
                        simulateFailure,
                      },
                      simulateFailure
                        ? "Case is ready. Email failed safely; retry it from Clinic messages."
                        : "Case is ready. Clinic email captured in the test outbox.",
                    )
                  }
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
