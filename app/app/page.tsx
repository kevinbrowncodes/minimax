import { readConfig } from "@/lib/config";

// Placeholder page (STORY_007): proves the container, the config and the LAN URL end to end. Replaced by EPIC_003.
export const dynamic = "force-dynamic";

export default function HomePage() {
  const { modelBaseUrl } = readConfig();
  const host = new URL(modelBaseUrl).host;
  return (
    <main>
      <h1>MiniMax Local</h1>
      <p>Generation server: {host}</p>
    </main>
  );
}
