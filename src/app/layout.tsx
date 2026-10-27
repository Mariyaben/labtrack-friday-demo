import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "LabTrack — A clearer day in the lab",
  description:
    "A focused dental lab workspace. Track cases, trust your dates, and keep clinics in the loop.",
  robots: { index: false, follow: false },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
