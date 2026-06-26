import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import UserSwitcher from "@/components/UserSwitcher";
import { UserProvider } from "@/lib/UserContext";
import { StageProvider } from "@/lib/StageContext";

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
  manifest: "/manifest.json",
  themeColor: "#0b1121",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "FIFA Pool",
  },
  viewport: "width=device-width, initial-scale=1, viewport-fit=cover",
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
          <StageProvider>
            <Navbar />
            <div className="top-bar">
              <UserSwitcher />
            </div>
            <main className="main-content">{children}</main>
          </StageProvider>
        </UserProvider>
      </body>
    </html>
  );
}
