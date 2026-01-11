import type { Metadata } from "next";
import { Outfit, Fira_Code } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const firaCode = Fira_Code({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "SciVid.AI - AI Academic Video Generator",
  description: "Transform academic papers into engaging video summaries using Gemini, Veo, and ImageFX",
  keywords: ["academic", "paper", "video", "AI", "Gemini", "Veo", "research"],
  authors: [{ name: "SciVid.AI Team" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${outfit.variable} ${firaCode.variable} antialiased font-sans`}
      >
        {children}
      </body>
    </html>
  );
}
