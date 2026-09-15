"use client";
import { useEffect, useRef, useState } from "react";
import { cx } from "@/lib/cx";
import { MASK, isValidKey, type MaskedVar } from "@/lib/env";
import { IconClose, IconPlus, IconTrash } from "@/components/shell/icons";
import styles from "./env-dialog.module.css";

export interface EnvDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly fetchImpl?: typeof fetch;
}

interface Row {
  readonly id: number;
  readonly key: string;
  readonly value: string;
  /** A stored variable: the value is masked until a new one is typed; empty on Save keeps it. */
  readonly stored: boolean;
  readonly reveal: boolean;
}

const IconEye = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" aria-hidden="true"><path d="M1.5 8s2.5-4.5 6.5-4.5S14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8z" /><circle cx="8" cy="8" r="2" /></svg>
);

/**
 * + › Environment variables (STORY_035; behaviour-attach-env-01-environment-variables@1440): a 600-wide dialog — the
 * title and ×, a note, a row per variable (key name · Key value with an eye · trash), Add Variables, Save. Stored values
 * come back masked and stay masked (the server never echoes them); typing replaces one, an empty value keeps it. Keys
 * are checked inline. The note is honest about where the values live (Departures: no encryption).
 */
export function EnvDialog(props: EnvDialogProps) {
  if (!props.open) return null;
  return <EnvDialogBody {...props} />;
}

function EnvDialogBody({ onClose, fetchImpl }: EnvDialogProps) {
  const doFetch = fetchImpl ?? fetch;
  const nextId = useRef(1);
  const [rows, setRows] = useState<readonly Row[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [errors, setErrors] = useState<Readonly<Record<number, string>>>({});
  const [failure, setFailure] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const fresh = (over: Partial<Row> = {}): Row => ({ id: nextId.current++, key: "", value: "", stored: false, reveal: false, ...over });

  useEffect(() => {
    let cancelled = false;
    void doFetch("/api/env")
      .then(async (res) => (res.ok ? ((await res.json()) as { vars: MaskedVar[] }).vars : []))
      .catch(() => [] as MaskedVar[])
      .then((vars) => {
        if (cancelled) return;
        setRows(vars.length === 0 ? [fresh()] : vars.map((v) => fresh({ key: v.key, stored: true })));
        setLoaded(true);
      });
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      cancelled = true;
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once on open
  }, []);

  const update = (id: number, patch: Partial<Row>): void => {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
    setErrors((current) => (current[id] === undefined ? current : Object.fromEntries(Object.entries(current).filter(([k]) => Number(k) !== id))));
  };

  const save = async (): Promise<void> => {
    const kept = rows.filter((row) => row.key.trim() !== "" || row.value !== "");
    const found: Record<number, string> = {};
    const seen = new Set<string>();
    for (const row of kept) {
      const key = row.key.trim();
      if (!isValidKey(key)) found[row.id] = "A name is A-Z, 0-9 and _, and does not start with a digit";
      else if (seen.has(key)) found[row.id] = `${key} is listed twice`;
      else if (!row.stored && row.value === "") found[row.id] = "Give it a value";
      seen.add(key);
    }
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setBusy(true);
    setFailure(undefined);
    const vars = Object.fromEntries(kept.map((row) => [row.key.trim(), row.stored && row.value === "" ? null : row.value]));
    const res = await doFetch("/api/env", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ vars }) }).catch(() => undefined);
    setBusy(false);
    if (res?.ok === true) onClose();
    else setFailure("That did not save — the app's server did not answer");
  };

  return (
    <div className={styles.backdrop} data-testid="env-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className={styles.dialog} role="dialog" aria-labelledby="env-title" aria-busy={!loaded}>
        <div className={styles.head}>
          <h2 id="env-title" className={styles.title}>Environment variables</h2>
          <button type="button" className={styles.close} aria-label="Close" onClick={onClose}><IconClose /></button>
        </div>
        <p className={styles.note}>Values are kept on the Spark in the app&apos;s data directory as plain JSON (mode 600), for the integrations that need them — a bot token, an API key. They are not encrypted.</p>
        <ul className={styles.rows} aria-label="Variables">
          {rows.map((row) => (
            <li key={row.id} className={styles.row} data-testid="env-row">
              <input className={cx(styles.input, styles.key, errors[row.id] !== undefined && styles.inputError)} placeholder="key name" aria-label="key name" value={row.key} spellCheck={false} onChange={(event) => { update(row.id, { key: event.target.value.toUpperCase() }); }} />
              <span className={styles.valueWrap}>
                <input className={cx(styles.input, styles.value)} type={row.reveal ? "text" : "password"} placeholder={row.stored ? MASK : "Key value"} aria-label="Key value" value={row.value} autoComplete="off" onChange={(event) => { update(row.id, { value: event.target.value }); }} />
                <button type="button" className={styles.eye} aria-label={row.reveal ? "Hide value" : "Show value"} aria-pressed={row.reveal} onClick={() => { update(row.id, { reveal: !row.reveal }); }}><IconEye /></button>
              </span>
              <button type="button" className={styles.trash} aria-label={`Remove ${row.key || "variable"}`} onClick={() => { setRows((current) => current.filter((r) => r.id !== row.id)); }}><IconTrash /></button>
              {errors[row.id] !== undefined ? <span className={styles.error} role="alert">{errors[row.id]}</span> : null}
            </li>
          ))}
        </ul>
        <button type="button" className={styles.add} onClick={() => { setRows((current) => [...current, fresh()]); }}><IconPlus /> Add Variables</button>
        {failure !== undefined ? <p className={styles.failure} role="alert">{failure}</p> : null}
        <div className={styles.actions}>
          <button type="button" className={styles.save} disabled={busy || !loaded} onClick={() => void save()}>Save</button>
        </div>
      </div>
    </div>
  );
}
