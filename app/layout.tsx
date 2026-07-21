import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "OEE Loss Tree & Predictive Maintenance Prioritizer — MVP",
  description: "Kearney KOSMIC Case 9 — AI-enabled OEE Loss Tree & PdM Prioritizer, live on the AI4I 2020 dataset.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
