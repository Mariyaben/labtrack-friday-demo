import { addDays, type LabCase } from "./domain";
export function seedCases(today: string): LabCase[] {
  const items = [
    ["LT-2041", "REF · 041", "The Smile Studio", "london@smile.example", "Europe/London", "UK", "Zirconia crown", "16", -1, "quality_check", "rush"],
    ["LT-2042", "REF · 042", "Bayside Dental", "team@bayside.example", "America/Los_Angeles", "USA", "Ceramic bridge", "24–26", 0, "quality_check", "standard"],
    ["LT-2043", "REF · 043", "Pearl Dental Care", "cases@pearl.example", "Asia/Kolkata", "India", "E.max crown", "11", 0, "in_progress", "rush"],
    ["LT-2044", "REF · 044", "Nordic Smile", "lab@nordic.example", "Europe/Stockholm", "Sweden", "Implant crown", "36", 1, "in_progress", "standard"],
    ["LT-2045", "REF · 045", "Harbour Dental", "team@harbour.example", "Australia/Sydney", "Australia", "Zirconia crown", "46", 1, "received", "standard"],
    ["LT-2046", "REF · 046", "The Smile Studio", "london@smile.example", "Europe/London", "UK", "Ceramic veneers", "12–22", 2, "in_progress", "standard"],
    ["LT-2047", "REF · 047", "Bayside Dental", "team@bayside.example", "America/Los_Angeles", "USA", "E.max crown", "21", 2, "received", "standard"],
    ["LT-2048", "REF · 048", "Pearl Dental Care", "cases@pearl.example", "Asia/Kolkata", "India", "Implant bridge", "34–36", 3, "received", "standard"]
  ];
  return items.map(v => ({ id: v[0] as string, code: v[0] as string, reference: v[1] as string, clinic: v[2] as string, clinic_email: v[3] as string, clinic_timezone: v[4] as string, country: v[5] as string, treatment: v[6] as string, teeth: v[7] as string, due_date: addDays(today, v[8] as number), status: v[9] as LabCase["status"], priority: v[10] as LabCase["priority"], ready_at: null, version: 1 }));
}
