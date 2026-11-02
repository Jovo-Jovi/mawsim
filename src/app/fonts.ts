import { IBM_Plex_Sans_Arabic, Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  weight: "variable",
  display: "swap",
  variable: "--font-inter",
});

const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "600", "700"],
  display: "swap",
  variable: "--font-plex-arabic",
});

export const fontVariableClass = `${inter.variable} ${plexArabic.variable}`;
