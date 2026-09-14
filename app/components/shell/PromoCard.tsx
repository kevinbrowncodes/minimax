"use client";
import { useState } from "react";
import { cx } from "@/lib/cx";
import { Inert } from "./Inert";
import { IconClose } from "./icons";
import styles from "./promo.module.css";

export interface PromoCardProps {
  readonly onDismiss: () => void;
}

/**
 * The home's fixed promo carousel (STORY_021; home-signed-in@1440 page 1, promo-carousel-page-2@1440 page 2): two
 * pages with dot buttons named "1" and "2" and a close. The reference's illustrations are theirs, so ours are drawn;
 * the headlines are kept. The card is a promotion for the reference's products, so every control on it is inert.
 */
export function PromoCard({ onDismiss }: PromoCardProps) {
  const [page, setPage] = useState<1 | 2>(1);
  return (
    <aside className={styles.card} aria-label="Promotion" data-testid="promo-card">
      <button type="button" className={styles.close} aria-label="Close" onClick={onDismiss}><IconClose /></button>
      {page === 1 ? (
        <>
          <div className={cx(styles.art, styles.artH3)} aria-hidden="true"><span className={styles.artReel} /><span className={styles.artReel} /><span className={styles.artFilm} /></div>
          <h3 className={styles.title}>H3 takes the stage. Let the show begin.</h3>
          <p className={styles.body}>MiniMax H3 is now live in MiniMax Code. Now through 9/15, generate videos with check-in credits or paid credits. After that, paid credits only.</p>
        </>
      ) : (
        <>
          <div className={cx(styles.art, styles.artDesktop)} aria-hidden="true"><span className={styles.artDock}><i /><i className={styles.artDockLogo} /><i /><i /></span></div>
          <h3 className={styles.title}>New MiniMax Desktop</h3>
          <p className={styles.body}>Remembers your habits, builds Agent teams, automates the repetitive work.</p>
          <Inert label="Download desktop" className={styles.primary} align="end">Download desktop</Inert>
        </>
      )}
      <div className={styles.dots}>
        <button type="button" className={cx(styles.dot, page === 1 && styles.dotActive)} aria-label="1" aria-pressed={page === 1} onClick={() => { setPage(1); }} />
        <button type="button" className={cx(styles.dot, page === 2 && styles.dotActive)} aria-label="2" aria-pressed={page === 2} onClick={() => { setPage(2); }} />
      </div>
    </aside>
  );
}
