import { test } from "node:test";
import assert from "node:assert/strict";
import { addDays, calendarDate, dateInZone, formatDate } from "../src/lib/domain";

test("due dates remain the same in negative, positive and DST time zones", () => {
  const before = process.env.TZ;
  try {
    for (const zone of ["UTC", "America/Los_Angeles", "Pacific/Kiritimati", "Europe/London", "Asia/Kathmandu", "Australia/Sydney"]) {
      process.env.TZ = zone;
      for (const [date, label] of [["2026-03-08", "8 March 2026"], ["2026-10-25", "25 October 2026"], ["2026-11-01", "1 November 2026"], ["2028-02-29", "29 February 2028"]]) {
        assert.equal(formatDate(date, "long"), label, `${zone}: ${date}`);
      }
    }
  } finally { process.env.TZ = before; }
});
test("strict calendar validation rejects overflow dates and timestamp input", () => {
  for (const value of ["2026-02-29", "2026-04-31", "2026-13-01", "2026-00-01", "2026-10-00", "2026-1-1", "2026-10-30T00:00:00Z", "1999-12-31", "2101-01-01"]) assert.equal(calendarDate.safeParse(value).success, false, value);
  assert.equal(calendarDate.safeParse("2028-02-29").success, true);
});
test("lab today follows a named zone at a UTC date boundary", () => {
  const now = new Date("2026-10-29T20:00:00Z");
  assert.equal(dateInZone(now), "2026-10-30");
  assert.equal(dateInZone(now, "America/Los_Angeles"), "2026-10-29");
});
test("calendar arithmetic crosses month, year and leap-day boundaries", () => {
  assert.equal(addDays("2026-12-31",1), "2027-01-01");
  assert.equal(addDays("2028-03-01",-1), "2028-02-29");
  assert.equal(addDays("2026-03-08",1), "2026-03-09");
});
