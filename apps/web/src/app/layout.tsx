import type { Metadata } from "next";
import { Chakra_Petch, Manrope } from "next/font/google";
import "./globals.css";

const display = Chakra_Petch({
  variable: "--font-display",
  weight: ["500", "600", "700"],
  subsets: ["latin"],
});

const body = Manrope({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "S21 Stat Card",
  description:
    "School 21 academic progress rendered as an RPG character card: level, XP, skills, and achievements.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
