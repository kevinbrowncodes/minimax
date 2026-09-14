"use client";
import { cx } from "@/lib/cx";
import { Inert } from "@/components/shell/Inert";
import { IconAgent, IconChevronDown, IconPlane, IconPlus } from "@/components/shell/icons";
import styles from "./pages.module.css";

/** Connect mobile (STORY_025; page-connect-mobile@1440): the bot list and the New Bot form, every control inert. */
export function ConnectMobilePage() {
  return (
    <main className={cx(styles.page, styles.connectPage)} data-testid="connect-page">
      <div className={styles.botList}>
        <Inert label="New Bot" className={cx(styles.botCard)}>
          <span className={styles.botDot} aria-hidden="true" />
          <span className={styles.botPlane} aria-hidden="true"><IconPlane /></span>
          <span className={styles.botText}>
            <span className={styles.botName}>New Bot</span>
            <span className={styles.botKind}>Telegram</span>
          </span>
        </Inert>
        <Inert label="Create IM Bot" className={styles.botCreate}><IconPlus /> Create IM Bot</Inert>
      </div>
      <div className={styles.botForm}>
        <div className={styles.botFormHead}>
          <span className={styles.botFormTitle}>New Bot</span>
          <span className={styles.botFormStatus}><span className={styles.botDot} aria-hidden="true" /> Telegram <span className={styles.botFormMuted}>Not bound</span></span>
        </div>
        <section className={styles.botSection}>
          <span className={styles.botSectionTitle}>Connect a bot</span>
          <span className={styles.botSectionLine}>Enter the Bot Token to finish connecting.</span>
        </section>
        <section className={styles.botSection}>
          <div className={styles.botSectionRow}>
            <span className={styles.botSectionTitle}>Connect Telegram</span>
            <Inert label="Connect" className={cx(styles.smallButton, styles.smallButtonDisabled)} align="end">Connect</Inert>
          </div>
          <input className={styles.botInput} placeholder="Enter Bot Token" aria-label="Enter Bot Token" readOnly />
          <span className={styles.botSectionLine}>Get a token from @BotFather on Telegram.</span>
        </section>
        <section className={cx(styles.botSection, styles.botSectionRow)}>
          <span>
            <span className={styles.botSectionTitle}>Choose an Agent</span>
            <span className={styles.botSectionLine}>Chat with different Agents.</span>
          </span>
          <Inert label="Choose an Agent: Default" className={styles.botSelect} align="end"><IconAgent /> Default <IconChevronDown /></Inert>
        </section>
        <section className={cx(styles.botSection, styles.botSectionRow)}>
          <span>
            <span className={styles.botSectionTitle}>Working directory</span>
            <span className={styles.botSectionLine}>Where conversation information is kept by default.</span>
          </span>
          <Inert label="Working directory: No project" className={cx(styles.botSelect, styles.botSelectPlain)} align="end">No project <IconChevronDown /></Inert>
        </section>
        <section className={cx(styles.botSection, styles.botSectionRow, styles.botSectionLast)}>
          <span>
            <span className={styles.botSectionTitle}>Delete Bot</span>
            <span className={styles.botSectionLine}>Remove this Bot from the list.</span>
          </span>
          <Inert label="Delete" className={cx(styles.smallButton, styles.smallButtonDisabled, styles.smallButtonPlain)} align="end">Delete</Inert>
        </section>
      </div>
    </main>
  );
}
