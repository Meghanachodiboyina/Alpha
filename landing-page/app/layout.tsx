import type { Metadata, Viewport } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--f-inter", display: "swap" });
const outfit = Outfit({ subsets: ["latin"], variable: "--f-outfit", display: "swap" });

export const metadata: Metadata = {
  title: "Routinely – Your Daily Routine Platform",
  description: "Routinely uses AI to build and optimize your daily schedule, helping you focus on what matters most.",
  keywords: ["productivity", "AI planner", "routine builder", "task management", "Routinely"],
  openGraph: {
    title: "Routinely – Your Daily Routine Platform",
    description: "Turn your goals into high-performance daily schedules with AI.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0a0a0f",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable}`}>
      <body>{children}</body>
    </html>
  );
}
