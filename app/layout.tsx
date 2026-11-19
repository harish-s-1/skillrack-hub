import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "SkillRack Hub", template: "%s · SkillRack Hub" },
  description: "Track your SkillRack points, streak and college rank, and get AI explanations of the code you solved.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@500;700&display=swap"
        />
      </head>
      <body>
        <nav className="nav">
          <div className="nav-in">
            <Link href="/" className="brand">SkillRack Hub</Link>
            <Link href="/leaderboard" className="link">Leaderboard</Link>
            <Link href="/explain" className="link">Explain my code</Link>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
