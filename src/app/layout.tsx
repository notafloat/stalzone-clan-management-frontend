import type { Metadata } from "next";
import {
  Geist,
  Geist_Mono,
  Golos_Text,
  JetBrains_Mono,
} from "next/font/google";
import { THEME_SCRIPT } from "@/lib/theme";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const golosText = Golos_Text({
  variable: "--font-golos",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Панель клана [MOZG] Zero Braincells",
  description:
    "Состав, журнал и отряды клана [MOZG] Zero Braincells в STALCRAFT",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ru"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${golosText.variable} ${jetBrainsMono.variable} h-full antialiased`}
    >
      <head>
        {/* Runs before the first paint, so a dark page never flashes white. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col has-data-bottom-nav:max-[759px]:pb-16">
        {children}
      </body>
    </html>
  );
}
