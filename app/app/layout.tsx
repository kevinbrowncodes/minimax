import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Shell } from "@/components/shell/Shell";
import { THEME_BOOT_SCRIPT } from "@/lib/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: "MiniMax Local",
  description: "A self-hosted video generation workstation",
};

export default function RootLayout({ children }: { readonly children: ReactNode }) {
  return (
    // suppressHydrationWarning: the boot script sets data-theme before React hydrates (STORY_019: no flash of the wrong theme).
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
