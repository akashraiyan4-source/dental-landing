import type { Metadata } from "next";
import "./globals.css";
import SmoothScroll from "./lib/SmoothScroll";

// Document metadata only (browser tab title, search snippet, no-referrer-leak) – no visual impact.
export const metadata: Metadata = {
  title: "SmileWay Studio | Luxury Cosmetic Dentistry in Beverly Hills",
  description:
    "Book a priority consultation with Dr. Julian Vance at SmileWay Studio – porcelain veneers, smile design and advanced cosmetic dentistry.",
  applicationName: "SmileWay Studio",
  formatDetection: { telephone: false, email: false, address: false },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <SmoothScroll />
        {children}
      </body>
    </html>
  );
}
