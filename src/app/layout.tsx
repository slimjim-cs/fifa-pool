import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import UserSwitcher from "@/components/UserSwitcher";
import { UserProvider } from "@/lib/UserContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FIFA Pool — World Cup Betting",
  description: "Private World Cup betting pool for friends",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <UserProvider>
          <Navbar />
          <div className="top-bar">
            <UserSwitcher />
          </div>
          <main className="main-content">{children}</main>
        </UserProvider>
      </body>
    </html>
  );
}
