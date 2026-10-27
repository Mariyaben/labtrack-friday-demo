import { ArrowDown, ChevronRight } from "lucide-react";
import { formatDate, type LabCase, type Mail } from "@/lib/domain";
import { CaseStatusLabel } from "./case-status";

type CaseTableProps = {
  cases: LabCase[];
  messages: Mail[];
  today: string;
  updatedCase: string | null;
  selectedCaseId?: string;
  onOpen: (item: LabCase) => void;
};

function clinicLocation(item: LabCase) {
  return `${item.country} · ${item.clinic_timezone.split("/").at(-1)!.replaceAll("_", " ")}`;
}

function DueDate({
  item,
  today,
  updated,
}: {
  item: LabCase;
  today: string;
  updated: boolean;
}) {
  const overdue = item.status !== "ready" && item.due_date < today;
  const dueToday = item.status !== "ready" && item.due_date === today;
  return (
    <span className="date-cell" data-overdue={overdue || undefined}>
      <time dateTime={item.due_date} title={formatDate(item.due_date, "long")}>
        {formatDate(item.due_date)} {item.due_date.slice(0, 4)}
      </time>
      {overdue ? (
        <small className="deadline-note overdue">Overdue</small>
      ) : updated ? (
        <small className="deadline-note updated-note">Date updated</small>
      ) : dueToday ? (
        <small className="deadline-note">Due today</small>
      ) : null}
    </span>
  );
}

export function CaseTable({
  cases,
  messages,
  today,
  updatedCase,
  selectedCaseId,
  onOpen,
}: CaseTableProps) {
  const retryCases = new Set(
    messages
      .filter((message) => message.status !== "captured")
      .map((message) => message.case_id),
  );

  return (
    <>
      <div
        className="table-scroll desktop-cases"
        tabIndex={0}
        role="region"
        aria-label="Cases. Scroll horizontally on smaller screens."
      >
        <table className="case-table">
          <colgroup>
            <col className="column-case" />
            <col className="column-clinic" />
            <col className="column-work" />
            <col className="column-date" />
            <col className="column-status" />
            <col className="column-action" />
          </colgroup>
          <thead>
            <tr>
              <th scope="col">Case</th>
              <th scope="col">Clinic</th>
              <th scope="col">Restoration</th>
              <th
                scope="col"
                aria-sort="ascending"
                title="Agreed calendar date, identical across time zones"
              >
                Due date <ArrowDown size={12} aria-hidden="true" />
              </th>
              <th scope="col">Production stage</th>
              <th scope="col">
                <span className="sr-only">Action</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {cases.map((item) => (
              <tr
                key={item.id}
                className="case-row"
                data-updated={updatedCase === item.id || undefined}
                data-active={selectedCaseId === item.id || undefined}
              >
                <td>
                  <button className="case-id" onClick={() => onOpen(item)}>
                    {item.code}
                  </button>
                  <small className="case-reference">{item.reference}</small>
                </td>
                <td>
                  <strong className="clinic-name">{item.clinic}</strong>
                  <small className="cell-meta">{clinicLocation(item)}</small>
                </td>
                <td>
                  <span className="restoration-name">{item.treatment}</span>
                  <small className="cell-meta">
                    Tooth <span className="tooth-code">{item.teeth}</span>
                    {item.priority === "rush" && (
                      <span className="rush-flag">Rush</span>
                    )}
                  </small>
                </td>
                <td>
                  <DueDate
                    item={item}
                    today={today}
                    updated={updatedCase === item.id}
                  />
                </td>
                <td>
                  <CaseStatusLabel status={item.status} />
                  {retryCases.has(item.id) && (
                    <small className="cell-meta overdue">
                      Email needs retry
                    </small>
                  )}
                </td>
                <td>
                  <button
                    className="row-action"
                    aria-label={`Open ${item.code}`}
                    onClick={() => onOpen(item)}
                  >
                    Open <ChevronRight size={13} aria-hidden="true" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="mobile-cases" aria-label="Cases">
        {cases.map((item) => (
          <li key={item.id} data-updated={updatedCase === item.id || undefined}>
            <button className="mobile-case" onClick={() => onOpen(item)}>
              <span className="sr-only">Open case </span>
              <span className="mobile-case-heading">
                <span className="case-id-text">{item.code}</span>
                <DueDate
                  item={item}
                  today={today}
                  updated={updatedCase === item.id}
                />
              </span>
              <span className="mobile-clinic">
                <strong>{item.clinic}</strong>
                <span>{clinicLocation(item)}</span>
              </span>
              <span className="mobile-restoration">
                {item.treatment}
                <span>
                  Tooth <span className="tooth-code">{item.teeth}</span> ·{" "}
                  {item.reference}
                </span>
              </span>
              <span className="mobile-case-bottom">
                <CaseStatusLabel status={item.status} />
                {item.priority === "rush" && (
                  <span className="rush-flag">Rush</span>
                )}
                {retryCases.has(item.id) && (
                  <span className="overdue">Email needs retry</span>
                )}
                <ChevronRight size={15} aria-hidden="true" />
              </span>
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
