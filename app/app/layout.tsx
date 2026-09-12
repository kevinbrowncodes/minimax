import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Shell } from "@/components/shell/Shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "MiniMax Local",
  description: "A self-hosted video generation workstation",
};

export default function RootLayout({ children }: { readonly children: ReactNode }) {
  // Recents come from the history store in STORY_014; until then the list is empty.
  return (
    <html lang="en">
      <body>
        <Shell recents={[]}>{children}</Shell>
      </body>
    </html>
  );
}
