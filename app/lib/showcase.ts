import { DEFAULT_DURATION, DEFAULT_RATIO, type ComposerMode } from "./composer-state";

/**
 * The Showcase rows (STORY_022; composer-video-mode@1440, mode-document@1440, mode-website@1440,
 * mode-image-generation@1440): four cards per mode. The reference's cards are its own content — example videos,
 * reports, sites and images — so ours are our own: the video scenes carry a prompt and parameters a card click types
 * into the composer; the other modes' cards are looks only. Thumbnails are drawn in CSS from the `art` key.
 */

export interface Scene {
  readonly id: string;
  readonly caption: string;
  readonly art: "neon" | "product" | "nature" | "portrait";
  readonly prompt: string;
  readonly ratio: string;
  readonly resolution: string;
  readonly durationSeconds: number;
}

export const VIDEO_SCENES: readonly Scene[] = [
  { id: "neon-street", caption: "Neon Street Dolly at Night", art: "neon", prompt: "A slow dolly shot along a rain-soaked neon street at night, reflections shimmering on wet asphalt, steady 24 fps, cinematic.", ratio: DEFAULT_RATIO, resolution: "768P", durationSeconds: DEFAULT_DURATION },
  { id: "product-turntable", caption: "Product Turntable Reveal", art: "product", prompt: "A studio turntable reveal of a matte white sneaker on a dark backdrop, soft key light sweeping across, slow rotation.", ratio: "1:1", resolution: "768P", durationSeconds: DEFAULT_DURATION },
  { id: "forest-dawn", caption: "Forest Dawn Fly-through", art: "nature", prompt: "A drone glides between pine trunks at dawn, mist drifting through shafts of light, gentle forward motion.", ratio: "21:9", resolution: "768P", durationSeconds: 8 },
  { id: "portrait-window", caption: "Portrait by a Rain Window", art: "portrait", prompt: "A close portrait by a rain-streaked window, warm lamp light, the subject turns slowly toward the camera.", ratio: "9:16", resolution: "768P", durationSeconds: DEFAULT_DURATION },
];

export interface ShowcaseCard {
  readonly id: string;
  readonly caption: string;
  readonly art: "report" | "table" | "analysis" | "chart" | "shop" | "landing" | "space" | "portfolio" | "painting" | "fashion" | "wildlife" | "noir";
}

/** The other modes' cards (captions of our own, in the reference's spirit: four per mode). */
export const MODE_CARDS: Readonly<Record<Exclude<ComposerMode, "text" | "video">, readonly ShowcaseCard[]>> = {
  document: [
    { id: "doc-1", caption: "Regulation Overview Report", art: "report" },
    { id: "doc-2", caption: "Hiring Fair Research Table", art: "table" },
    { id: "doc-3", caption: "Sector M&A Analysis", art: "analysis" },
    { id: "doc-4", caption: "Two-Product Comparison", art: "chart" },
  ],
  website: [
    { id: "web-1", caption: "Minimalist E-commerce Site", art: "shop" },
    { id: "web-2", caption: "Headphone Landing Page", art: "landing" },
    { id: "web-3", caption: "Space Tourism Website", art: "space" },
    { id: "web-4", caption: "Architecture Portfolio", art: "portfolio" },
  ],
  image: [
    { id: "img-1", caption: "Impressionist Street Café", art: "painting" },
    { id: "img-2", caption: "Editorial Fashion Portrait", art: "fashion" },
    { id: "img-3", caption: "Arctic Fox in Deep Snow", art: "wildlife" },
    { id: "img-4", caption: "1940s Film Noir Still", art: "noir" },
  ],
};
