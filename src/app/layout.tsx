import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "LabTrack | Case management",
  description: "Dental lab cases, agreed due dates and clinic notifications.",
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
