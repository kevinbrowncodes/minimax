"use client";
import { useEffect, useRef, useState } from "react";
import { cx } from "@/lib/cx";
import type { AgentInstruction } from "@/lib/agent-instruction-store";
import { IconClose } from "@/components/shell/icons";
import { ACCEPTED_IMAGE_TYPES } from "@/lib/upload-validation";
import settings from "@/components/shell/settings.module.css";
import styles from "./composer.module.css";

/** A From-you image the picker offers (Assets › From you › Images): a job's own reference file. */
export interface PickableImage {
  readonly historyId: string;
  readonly n: number;
  readonly name: string;
  readonly url: string;
  readonly stamp: string;
}
/** A row as the panel edits it: the store's fields, an optional local reference not yet uploaded is never held — uploads POST at once. */
export interface InstructionRow {
  readonly id: string;
  readonly title: string;
  readonly text: string;
  readonly active: boolean;
  readonly hasReference: boolean;
  /** The image to show for the reference (the route), with a cache-buster after a change. */
  readonly referenceUrl?: string;
  readonly referenceMissing?: boolean;
  /** True for a row added in this session and not yet PUT: its id is minted client-side and sent with the PUT. */
  readonly draft?: boolean;
}

export interface AgentInstructionsPanelProps {
  readonly open: boolean;
  readonly fetchImpl?: typeof fetch;
  readonly narrow?: boolean;
  readonly onClose: () => void;
  /** After Done: the active count, for the badge. */
  readonly onSaved: (activeCount: number) => void;
  readonly notify: (text: string) => void;
}

function rowOf(row: AgentInstruction, bust = 0): InstructionRow {
  return { id: row.id, title: row.title, text: row.text, active: row.active, hasReference: row.reference !== undefined, ...(row.reference === undefined ? {} : { referenceUrl: `/api/agent/instructions/${encodeURIComponent(row.id)}/reference${bust === 0 ? "" : `?v=${String(bust)}`}` }) };
}

/**
 * Agent instructions (STORY_052; Google Flow's panel in the Settings dialog's chrome): rows of a switch ("Toggle
 * instruction active"), a title, a guideline, + Reference (a picker over Assets › From you, or Upload media) and
 * Delete instruction; + Add instruction; Done PUTs the list. × and Escape discard unsaved edits (uploads and picks
 * are saved the moment they are made — the row's id is minted here and travels with the PUT).
 */
export function AgentInstructionsPanel(props: AgentInstructionsPanelProps) {
  return props.open ? <PanelBody key="open" {...props} /> : null;
}

function PanelBody({ fetchImpl, narrow = false, onClose, onSaved, notify }: AgentInstructionsPanelProps) {
  const doFetch = fetchImpl ?? fetch;
  const [rows, setRows] = useState<readonly InstructionRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [pickerFor, setPickerFor] = useState<string | undefined>(undefined);
  const [images, setImages] = useState<readonly PickableImage[]>([]);
  const [error, setError] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const focusTitle = useRef<string | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    void doFetch("/api/agent/instructions")
      .then(async (res) => (res.ok ? ((await res.json()) as { instructions: AgentInstruction[] }).instructions : []))
      .catch(() => [] as AgentInstruction[])
      .then((list) => {
        if (cancelled) return;
        setRows(list.map((r) => rowOf(r)));
        setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, when the panel opens
  }, []);
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        if (pickerFor !== undefined) setPickerFor(undefined);
        else onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    panelRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose, pickerFor]);
  useEffect(() => {
    if (focusTitle.current === undefined) return;
    const el = document.querySelector<HTMLInputElement>(`[data-instruction-title="${focusTitle.current}"]`);
    focusTitle.current = undefined;
    el?.focus();
  });

  const update = (id: string, patch: Partial<InstructionRow>): void => { setRows((list) => list.map((r) => (r.id === id ? { ...r, ...patch } : r))); };
  const add = (): void => {
    const id = crypto.randomUUID();
    focusTitle.current = id;
    setRows((list) => [...list, { id, title: "", text: "", active: true, hasReference: false, draft: true }]);
  };
  /** A draft row must exist on the server before a reference can be attached: PUT the list first. */
  const ensureSaved = async (): Promise<boolean> => {
    const res = await doFetch("/api/agent/instructions", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ instructions: rows.map((r) => ({ id: r.id, title: r.title || "Untitled", text: r.text || "(no guideline yet)", active: r.active })) }) });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
      setError(body.error?.message ?? `The instructions could not be saved (${String(res.status)})`);
      return false;
    }
    setRows((list) => list.map((r) => ({ ...r, draft: false })));
    return true;
  };
  const openPicker = async (id: string): Promise<void> => {
    setError(undefined);
    if (!(await ensureSaved())) return;
    const entries = await doFetch("/api/history").then(async (res) => (res.ok ? ((await res.json()) as { entries: { id: string; title: string; createdAt?: string; referenceFiles?: { n: number; name: string }[] }[] }).entries : [])).catch(() => []);
    const list: PickableImage[] = [];
    for (const entry of entries) for (const ref of entry.referenceFiles ?? []) list.push({ historyId: entry.id, n: ref.n, name: ref.name, url: `/api/history/${encodeURIComponent(entry.id)}/reference/${String(ref.n)}`, stamp: entry.createdAt === undefined ? entry.title : `${entry.createdAt.slice(2, 10).replaceAll("-", "-")}-${entry.createdAt.slice(11, 13)}${entry.createdAt.slice(14, 16)}` });
    setImages(list);
    setPickerFor(id);
  };
  const attach = async (id: string, init: RequestInit): Promise<void> => {
    setBusy(true);
    const res = await doFetch(`/api/agent/instructions/${encodeURIComponent(id)}/reference`, init).catch(() => undefined);
    setBusy(false);
    if (!res?.ok) {
      const body = (await res?.json().catch(() => ({}))) as { error?: { message?: string } } | undefined;
      setError(body?.error?.message ?? "The reference could not be attached");
      return;
    }
    const row = (await res.json()) as AgentInstruction;
    update(id, { ...rowOf(row, Date.now()), draft: false });
    setPickerFor(undefined);
  };
  const removeReference = async (id: string): Promise<void> => {
    const res = await doFetch(`/api/agent/instructions/${encodeURIComponent(id)}/reference`, { method: "DELETE" }).catch(() => undefined);
    if (res?.ok) update(id, { hasReference: false, referenceUrl: undefined, referenceMissing: false });
  };
  const done = async (): Promise<void> => {
    setError(undefined);
    setBusy(true);
    const res = await doFetch("/api/agent/instructions", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ instructions: rows.map((r) => ({ id: r.id, title: r.title, text: r.text, active: r.active })) }) }).catch(() => undefined);
    setBusy(false);
    if (!res?.ok) {
      const body = (await res?.json().catch(() => ({}))) as { error?: { message?: string } } | undefined;
      setError(body?.error?.message ?? "The instructions could not be saved");
      return;
    }
    const saved = (await res.json()) as { instructions: AgentInstruction[] };
    notify("Saved");
    onSaved(saved.instructions.filter((r) => r.active).length);
    onClose();
  };

  return (
    <div className={cx(settings.backdrop, styles.agentPanelBackdrop)} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }} data-testid="agent-instructions-backdrop">
      <div className={cx(styles.agentPanel, styles.agentInstructionsPanel, narrow && styles.agentPanelSheet)} role="dialog" aria-modal="true" aria-labelledby="agent-instructions-title" ref={panelRef} tabIndex={-1}>
        <div className={settings.panelHead}>
          <div className={styles.agentPanelHeadLeft}>
            {narrow ? <button type="button" className={settings.close} aria-label="Back" onClick={onClose}>←</button> : null}
            <h2 id="agent-instructions-title" className={settings.panelTitle}>Agent instructions</h2>
          </div>
          {narrow ? null : <button type="button" className={settings.close} aria-label="Close agent instructions" onClick={onClose}><IconClose /></button>}
        </div>
        <div className={settings.panelBody}>
          {loaded && rows.length === 0 ? <p className={styles.agentInstructionsEmpty}>No instructions yet — add a scene, a character or a house rule the director should always follow.</p> : null}
          <ul className={styles.agentInstructionList} aria-label="Instructions">
            {rows.map((row) => (
              <li key={row.id} className={styles.agentInstruction} data-testid="instruction-row">
                <div className={styles.agentInstructionHead}>
                  <button type="button" role="switch" aria-checked={row.active} aria-label="Toggle instruction active" className={cx(settings.switch, !row.active && settings.switchOff)} onClick={() => { update(row.id, { active: !row.active }); }}>
                    <span className={settings.switchKnob} />
                  </button>
                  <input className={styles.agentInstructionTitle} aria-label="Instruction title" placeholder="Instruction title" value={row.title} maxLength={80} data-instruction-title={row.id} onChange={(event) => { update(row.id, { title: event.target.value }); }} />
                  <button type="button" className={styles.agentIconButton} aria-label="Delete instruction" onClick={() => { setRows((list) => list.filter((r) => r.id !== row.id)); }}>🗑</button>
                </div>
                <div className={styles.agentInstructionRef}>
                  {row.hasReference ? (
                    <span className={cx(styles.thumb, styles.agentInstructionThumb, row.referenceMissing && styles.agentInstructionThumbMissing)}>
                      {/* eslint-disable-next-line @next/next/no-img-element -- the instruction's own image, served by our route */}
                      {row.referenceUrl ? <img src={row.referenceUrl} alt={`Reference for ${row.title || "the instruction"}`} onError={() => { update(row.id, { referenceMissing: true }); }} /> : null}
                      {row.referenceMissing ? <span className={styles.agentInstructionMissing}>missing</span> : null}
                      <button type="button" className={styles.thumbRemove} aria-label="Remove reference" onClick={() => void removeReference(row.id)}>×</button>
                    </span>
                  ) : (
                    <button type="button" className={styles.agentAddReference} disabled={busy} onClick={() => void openPicker(row.id)}>+ Reference</button>
                  )}
                </div>
                <textarea className={styles.agentInstructionText} aria-label="Instruction text" placeholder="Create a guideline for your agent" rows={3} maxLength={4000} value={row.text} onChange={(event) => { update(row.id, { text: event.target.value }); }} />
              </li>
            ))}
          </ul>
          <button type="button" className={styles.agentAddInstruction} onClick={add} disabled={rows.length >= 20}>+ Add instruction</button>
          {error !== undefined ? <p className={styles.error} role="alert">{error}</p> : null}
          <div className={cx(settings.buttonRow, styles.agentPanelButtons)}>
            <button type="button" className={settings.primaryButton} disabled={busy} onClick={() => void done()}>Done</button>
          </div>
        </div>
        {pickerFor !== undefined ? (
          <div className={styles.agentPicker} role="dialog" aria-label="Select reference image" data-testid="reference-picker">
            <div className={styles.agentPickerHead}>
              <span className={settings.preferenceTitle}>Select reference image</span>
              <span className={styles.agentPickerActions}>
                <button type="button" className={settings.secondaryButton} onClick={() => fileInput.current?.click()}>Upload media</button>
                <button type="button" className={settings.close} aria-label="Close picker" onClick={() => { setPickerFor(undefined); }}><IconClose /></button>
              </span>
            </div>
            <input ref={fileInput} type="file" accept={ACCEPTED_IMAGE_TYPES.join(",")} className={styles.hidden} data-testid="instruction-upload" onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (!file) return;
              const form = new FormData();
              form.append("referenceImage", file, file.name);
              void attach(pickerFor, { method: "POST", body: form });
            }} />
            {images.length === 0 ? <p className={styles.agentInstructionsEmpty}>No images yet — attach one to a generation, or upload.</p> : (
              <ul className={styles.agentPickerGrid} aria-label="From-you images">
                {images.map((image) => (
                  <li key={`${image.historyId}:${String(image.n)}`}>
                    <button type="button" className={styles.agentPickerTile} title={`${image.stamp} · ${image.name}`} onClick={() => void attach(pickerFor, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ historyId: image.historyId, n: image.n }) })}>
                      {/* eslint-disable-next-line @next/next/no-img-element -- a job's own reference image, served by our route */}
                      <img src={image.url} alt={`${image.stamp} ${image.name}`} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
