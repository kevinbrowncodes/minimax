"use client";
import { cx } from "@/lib/cx";
import { VIDEO_SCENES, type Scene } from "@/lib/showcase";
import { Inert } from "@/components/shell/Inert";
import { IconClose } from "@/components/shell/icons";
import styles from "./showcase.module.css";

export interface ShowcaseProps {
  readonly onScene: (scene: Scene) => void;
  readonly onDismiss: () => void;
}

/**
 * The Showcase row under the video composer (STORY_022; composer-video-mode@1440: title, ×, four 169×128 cards with
 * captions and a hover "Preview example"). A card types its prompt and parameters into the composer. The reference's
 * cards are its own content; ours are drawn.
 */
export function Showcase({ onScene, onDismiss }: ShowcaseProps) {
  return (
    <section className={styles.showcase} aria-label="Showcase" data-testid="showcase">
      <div className={styles.head}>
        <h2 className={styles.title}>Showcase</h2>
        <button type="button" className={styles.dismiss} aria-label="Clear selected scene" title="Clear selected scene" onClick={onDismiss}><IconClose /></button>
      </div>
      <div className={styles.grid}>
        {VIDEO_SCENES.map((card) => (
          <div key={card.id} className={styles.card}>
            <button type="button" className={cx(styles.thumb, styles[`art_${card.art}`])} aria-label={card.caption} onClick={() => { onScene(card); }}>
              <span className={styles.thumbMark} aria-hidden="true" />
            </button>
            <Inert label="Preview example" className={styles.preview} align="end">
              <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M1.5 8s2.5-4.5 6.5-4.5S14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8z" fill="none" stroke="currentColor" strokeWidth="1.3" /><circle cx="8" cy="8" r="2" fill="none" stroke="currentColor" strokeWidth="1.3" /></svg>
            </Inert>
            <span className={styles.caption}>{card.caption}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
