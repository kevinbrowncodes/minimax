import { DEFAULT_DURATION, DEFAULT_RATIO } from "./composer-state";

/**
 * The video Showcase row (STORY_022; composer-video-mode@1440): four cards. The reference's cards are its own example
 * videos, so ours are our own scenes: a card click types its prompt and parameters into the composer. Thumbnails are
 * drawn in CSS from the `art` key. STORY_026 removed the other modes and their cards.
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
