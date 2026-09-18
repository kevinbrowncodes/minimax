"use client";
import { useEffect, useRef, useState } from "react";
import { cx } from "@/lib/cx";
import { AGENT_DRAWS, type AgentConfirm, type AgentDraws } from "@/lib/settings";
import { IconClose } from "@/components/shell/icons";
import settings from "@/components/shell/settings.module.css";
import styles from "./composer.module.css";

export interface AgentSettingsPanelProps {
  readonly open: boolean;
  readonly confirm: AgentConfirm;
  /** STORY_055: draws per prompt. */
  readonly draws: AgentDraws;
  /** The model the pill names (capabilities.agent.model.label); "—" when the agent is not configured. */
  readonly modelLabel: string;
  readonly onSave: (confirm: AgentConfirm, draws: AgentDraws) => void;
  readonly onClose: () => void;
  readonly narrow?: boolean;
}

/**
 * Agent settings (STORY_051; Google Flow's panel in the Settings dialog's chrome): Confirm before generating —
 * Always / Never, in Flow's words, ours ending "use the Spark automatically" — a Video generation default section
 * (Draws x1 · x2 · x3 · x4 — STORY_055 — and the model), Save. 420 px anchored right at desktop; a full-width sheet at
 * 390 with ← in the head. Nothing is written before Save; × and Escape discard.
 */
export function AgentSettingsPanel(props: AgentSettingsPanelProps) {
  // the choices start from the saved settings every time the panel opens: the form is remounted on open (the key)
  return props.open ? <AgentSettingsForm key={`${props.confirm}:${String(props.draws)}`} {...props} /> : null;
}

function AgentSettingsForm({ open, confirm, draws, modelLabel, onSave, onClose, narrow = false }: AgentSettingsPanelProps) {
  const [choice, setChoice] = useState<AgentConfirm>(confirm);
  const [count, setCount] = useState<AgentDraws>(draws);
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    panelRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);
  const option = (value: AgentConfirm, title: string, description: string) => (
    <label className={cx(settings.preference, styles.agentOption)}>
      <input type="radio" name="agent-confirm" value={value} checked={choice === value} onChange={() => { setChoice(value); }} className={styles.agentRadio} />
      <span className={settings.preferenceText}>
        <span className={settings.preferenceTitle}>{title}</span>
        <span className={settings.preferenceDescription}>{description}</span>
      </span>
    </label>
  );
  return (
    <div className={cx(settings.backdrop, styles.agentPanelBackdrop)} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }} data-testid="agent-settings-backdrop">
      <div className={cx(styles.agentPanel, narrow && styles.agentPanelSheet)} role="dialog" aria-modal="true" aria-labelledby="agent-settings-title" ref={panelRef} tabIndex={-1}>
        <div className={settings.panelHead}>
          <div className={styles.agentPanelHeadLeft}>
            {narrow ? <button type="button" className={settings.close} aria-label="Back" onClick={onClose}>←</button> : null}
            <h2 id="agent-settings-title" className={settings.panelTitle}>Agent settings</h2>
          </div>
          {narrow ? null : <button type="button" className={settings.close} aria-label="Close agent settings" onClick={onClose}><IconClose /></button>}
        </div>
        <div className={settings.panelBody}>
          <h3 className={settings.sectionTitle}>Confirm before generating</h3>
          <div className={settings.preferences} role="radiogroup" aria-label="Confirm before generating">
            {option("always", "Always", "Agent will ask for confirmation before generating media.")}
            {option("never", "Never", "Agent will generate media and use the Spark automatically.")}
          </div>
          <h3 className={cx(settings.sectionTitle, styles.agentSectionGap)}>Video generation default</h3>
          <div className={settings.preferences}>
            <div className={settings.preference}>
              <span className={settings.preferenceText}>
                <span className={settings.preferenceTitle}>Draws</span>
                <span className={settings.preferenceDescription}>Each draw is a job with its own seed, queued one after another.</span>
              </span>
              {/* STORY_055: the parameters popover's radio track (radio-duration@1440: 36 × 24, 12 px/500) */}
              <span className={styles.agentDraws} role="radiogroup" aria-label="Draws">
                {AGENT_DRAWS.map((n) => (
                  <label key={n} className={cx(styles.agentDraw, count === n && styles.agentDrawOn)}>
                    <input type="radio" name="agent-draws" value={n} checked={count === n} onChange={() => { setCount(n); }} className={styles.agentRadio} aria-label={`x${String(n)}`} />
                    x{n}
                  </label>
                ))}
              </span>
            </div>
            <div className={settings.preference}>
              <span className={settings.preferenceText}>
                <span className={settings.preferenceTitle}>Model</span>
                <span className={settings.preferenceDescription} data-testid="agent-settings-model">{modelLabel} · Vertex AI</span>
              </span>
            </div>
          </div>
          <div className={cx(settings.buttonRow, styles.agentPanelButtons)}>
            <button type="button" className={settings.secondaryButton} onClick={onClose}>Cancel</button>
            <button type="button" className={settings.primaryButton} onClick={() => { onSave(choice, count); }}>Save</button>
          </div>
        </div>
      </div>
    </div>
  );
}
