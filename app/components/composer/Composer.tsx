"use client";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useReducer, useRef, useState, type ChangeEvent, type DragEvent, type KeyboardEvent } from "react";
import { canSend, durationOptions, initialComposer, isModelEnabled, isResolutionEnabled, paramsLabel, reduceComposer, REFERENCE_MODELS, REFERENCE_RATIOS, REFERENCE_RESOLUTIONS, type ComposerImage } from "@/lib/composer-state";
import { cx } from "@/lib/cx";
import type { Capabilities } from "@/lib/job-api";
import { submitJob } from "@/lib/submit-job";
import { ACCEPTED_IMAGE_TYPES } from "@/lib/upload-validation";
import styles from "./composer.module.css";

const INERT_TITLE = "Not part of MiniMax Local";
const PLACEHOLDER = "Enter message... (use / for commands)";

function objectUrl(file: File): string {
  return typeof URL.createObjectURL === "function" ? URL.createObjectURL(file) : "";
}

const RatioGlyph = ({ ratio }: { readonly ratio: string }) => {
  const [w, h] = ratio.split(":").map(Number);
  const wide = (w ?? 1) >= (h ?? 1);
  const width = wide ? 14 : Math.max(6, Math.round((14 * (w ?? 1)) / (h ?? 1)));
  const height = wide ? Math.max(6, Math.round((14 * (h ?? 1)) / (w ?? 1))) : 14;
  return <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><rect x={(16 - width) / 2} y={(16 - height) / 2} width={width} height={height} rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.3" /></svg>;
};

export interface ComposerProps {
  /** Injected for tests; the page uses the real fetch. */
  readonly fetchImpl?: typeof fetch;
}

/** The home composer (STORY_013): text mode, video mode with references, model, parameters, Send. */
export function Composer({ fetchImpl }: ComposerProps) {
  const router = useRouter();
  const [state, dispatch] = useReducer(reduceComposer, undefined, initialComposer);
  const [popover, setPopover] = useState<"params" | "model" | undefined>(undefined);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const urls = useRef(new Map<string, string>());
  const doFetch = fetchImpl ?? fetch;

  useEffect(() => {
    let cancelled = false;
    doFetch("/api/capabilities")
      .then(async (res) => {
        if (!res.ok) throw new Error(`capabilities ${String(res.status)}`);
        return (await res.json()) as Capabilities;
      })
      .then((capabilities) => {
        if (!cancelled) dispatch({ type: "capabilities", capabilities });
      })
      .catch(() => {
        if (!cancelled) dispatch({ type: "capabilities-failed", message: "The generation server is unreachable" });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetch once on mount
  }, []);

  useEffect(() => {
    const live = new Set(state.images.map((i) => i.id));
    for (const [id, url] of urls.current) {
      if (!live.has(id)) {
        if (url && typeof URL.revokeObjectURL === "function") URL.revokeObjectURL(url);
        urls.current.delete(id);
      }
    }
  }, [state.images]);

  useEffect(() => {
    if (!popover) return;
    const onKey = (event: globalThis.KeyboardEvent): void => {
      if (event.key === "Escape") setPopover(undefined);
    };
    const onClick = (event: MouseEvent): void => {
      if (!(event.target instanceof Element) || !event.target.closest("[data-popover]")) setPopover(undefined);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick);
    };
  }, [popover]);

  const addFiles = useCallback((files: readonly File[]) => {
    if (files.length === 0) return;
    const images: ComposerImage[] = files.map((file) => {
      const id = `${String(Date.now())}-${Math.random().toString(36).slice(2, 8)}`;
      const url = objectUrl(file);
      urls.current.set(id, url);
      return { id, file, url, name: file.name, type: file.type, size: file.size };
    });
    dispatch({ type: "add-images", images });
  }, []);

  const onFiles = (event: ChangeEvent<HTMLInputElement>): void => {
    addFiles(Array.from(event.target.files ?? []));
    event.target.value = "";
  };
  const onDrop = (event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    setDragging(false);
    if (state.mode !== "video") return;
    addFiles(Array.from(event.dataTransfer.files));
  };

  const send = async (): Promise<void> => {
    if (!canSend(state)) return;
    if (state.mode !== "video") {
      dispatch({ type: "error", error: { message: "MiniMax Local only generates videos — pick Video generation" } });
      return;
    }
    dispatch({ type: "submit-start" });
    const result = await submitJob(state, doFetch);
    if (result.ok) {
      router.push(`/task/${encodeURIComponent(result.id)}`);
      return;
    }
    dispatch({ type: "error", error: { message: result.message, ...(result.field === undefined ? {} : { field: result.field }) } });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void send();
    }
  };

  const video = state.mode === "video";
  const caps = state.capabilities;

  return (
    <div className={styles.wrap}>
      <div
        className={cx(styles.card, dragging && styles.cardDrop)}
        onDragOver={(event) => {
          if (video) {
            event.preventDefault();
            setDragging(true);
          }
        }}
        onDragLeave={() => {
          setDragging(false);
        }}
        onDrop={onDrop}
        data-testid="composer"
      >
        {video ? (
          <div className={styles.references}>
            {state.images.map((image, index) => (
              <div key={image.id} className={styles.thumb}>
                {/* eslint-disable-next-line @next/next/no-img-element -- an object URL thumbnail; next/image cannot optimise a local blob */}
                {image.url ? <img src={image.url} alt={`Reference image ${String(index + 1)}`} /> : <span className={styles.hidden}>{`Reference image ${String(index + 1)}`}</span>}
                <button type="button" className={styles.thumbRemove} aria-label={`Remove Reference image ${String(index + 1)}`} onClick={() => { dispatch({ type: "remove-image", id: image.id }); }}>×</button>
              </div>
            ))}
            {state.images.length < (caps?.referenceImages.max ?? 2) ? (
              <button type="button" className={styles.tile} onClick={() => fileInput.current?.click()} aria-label="Add reference image">
                <span className={styles.tilePlus} aria-hidden="true">+</span>
                <span>Reference</span>
              </button>
            ) : null}
            <input ref={fileInput} type="file" accept={ACCEPTED_IMAGE_TYPES.join(",")} multiple className={styles.hidden} onChange={onFiles} data-testid="reference-input" />
          </div>
        ) : null}
        <div className={styles.editorRow}>
          {video ? (
            <span className={styles.tag}>
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><rect x="1" y="3" width="8" height="8" rx="2" fill="currentColor" /><path d="M9 6.5 13 4.5v5L9 7.5z" fill="currentColor" /></svg>
              video-creator
              <button type="button" className={styles.tagRemove} aria-label="Remove video-creator" onClick={() => { dispatch({ type: "leave-video-mode" }); }}>×</button>
            </span>
          ) : null}
          <textarea
            className={styles.editor}
            aria-label="Message"
            placeholder={PLACEHOLDER}
            value={state.text}
            rows={2}
            onChange={(event) => { dispatch({ type: "text", text: event.target.value }); }}
            onKeyDown={onKeyDown}
          />
        </div>
        <div className={styles.bar}>
          <span className={styles.iconButton} role="button" aria-disabled="true" title={INERT_TITLE} aria-label="Add attachment">+</span>
          <span className={styles.inert} role="switch" aria-checked="false" aria-disabled="true" title={INERT_TITLE}>
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><rect x="2" y="3" width="12" height="8" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.3" /><path d="M6 13.5h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>
            Agent Team
          </span>
          {video ? (
            <>
              <span style={{ position: "relative" }} data-popover="model">
                <button type="button" className={styles.pill} aria-haspopup="menu" aria-expanded={popover === "model"} aria-label={`Model: ${REFERENCE_MODELS.find((m) => m.id === state.model)?.label ?? "MiniMax-H3"}`} onClick={() => { setPopover(popover === "model" ? undefined : "model"); }} disabled={!caps}>
                  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><circle cx="7" cy="7" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.3" /><circle cx="7" cy="7" r="2" fill="currentColor" /></svg>
                  {(REFERENCE_MODELS.find((m) => m.id === state.model)?.label ?? "MiniMax-H3.0").replace(".0", "")}
                  <span aria-hidden="true">⌄</span>
                </button>
                {popover === "model" ? (
                  <div className={styles.menu} role="menu" aria-label="Model">
                    {REFERENCE_MODELS.map((m) => {
                      const enabled = isModelEnabled(state, m.id);
                      return (
                        <button key={m.id} type="button" role="menuitemradio" aria-checked={state.model === m.id} className={styles.menuItem} disabled={!enabled} onClick={() => { dispatch({ type: "model", model: m.id }); setPopover(undefined); }}>
                          <span>{state.model === m.id ? "● " : ""}{m.label}</span>
                          {enabled ? null : <span className={styles.menuNote}>not on the Spark</span>}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </span>
              <span style={{ position: "relative" }} data-popover="params">
                <button type="button" className={styles.pill} aria-haspopup="dialog" aria-expanded={popover === "params"} aria-label={`Video parameters: ${paramsLabel(state)}`} onClick={() => { setPopover(popover === "params" ? undefined : "params"); }} disabled={!caps}>
                  <RatioGlyph ratio={state.ratio} /> {state.ratio}
                  <span className={styles.pillSep} aria-hidden="true" />
                  {state.resolution || "768P"}
                  <span className={styles.pillSep} aria-hidden="true" />
                  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><circle cx="7" cy="7" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.3" /><path d="M7 4v3l2 1.3" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>
                  {String(state.durationSeconds)}s
                </button>
                {popover === "params" && caps ? (
                  <div className={styles.popover} role="dialog" aria-label="Video parameters">
                    <span className={styles.sectionLabel}>Ratio</span>
                    <div className={styles.track} role="radiogroup" aria-label="Ratio">
                      {REFERENCE_RATIOS.map((ratio) => (
                        <button key={ratio} type="button" role="radio" aria-checked={state.ratio === ratio} className={cx(styles.segment, styles.segmentRatio, state.ratio === ratio && styles.segmentSelected)} disabled={!caps.ratios.includes(ratio)} onClick={() => { dispatch({ type: "ratio", ratio }); }}>
                          <RatioGlyph ratio={ratio} />
                          {ratio}
                        </button>
                      ))}
                    </div>
                    <span className={styles.sectionLabel}>Resolution</span>
                    <div className={styles.track} role="radiogroup" aria-label="Resolution">
                      {REFERENCE_RESOLUTIONS.map((resolution) => {
                        const enabled = isResolutionEnabled(state, resolution);
                        return (
                          <button key={resolution} type="button" role="radio" aria-checked={state.resolution === resolution} className={cx(styles.segment, state.resolution === resolution && styles.segmentSelected)} disabled={!enabled} title={enabled ? undefined : "not on the Spark"} onClick={() => { dispatch({ type: "resolution", resolution }); }}>
                            {resolution}{enabled ? "" : " — not on the Spark"}
                          </button>
                        );
                      })}
                    </div>
                    <span className={styles.sectionLabel}>Duration</span>
                    <div className={styles.track} role="radiogroup" aria-label="Duration">
                      {durationOptions(state).map((seconds) => (
                        <button key={seconds} type="button" role="radio" aria-checked={state.durationSeconds === seconds} className={cx(styles.segment, state.durationSeconds === seconds && styles.segmentSelected)} onClick={() => { dispatch({ type: "duration", durationSeconds: seconds }); }}>
                          {String(seconds)}s
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </span>
            </>
          ) : null}
          <div className={styles.barRight}>
            <span className={styles.inertModel} role="button" aria-disabled="true" title={INERT_TITLE}>MiniMax-M3 <span aria-hidden="true">⌄</span></span>
            <button type="button" className={styles.send} aria-label="Send message" disabled={!canSend(state)} onClick={() => void send()}>
              <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 13V3.5M4.5 7 8 3.5 11.5 7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          </div>
        </div>
      </div>
      {state.error ? (
        <div className={styles.error} role="alert" data-field={state.error.field}>
          <span aria-hidden="true">ⓘ</span> {state.error.message}
        </div>
      ) : null}
      {state.capabilitiesError ? <div className={styles.error} role="alert">{state.capabilitiesError}</div> : null}
      <div className={styles.chips} role="group" aria-label="Modes">
        <button type="button" className={cx(styles.chip, video && styles.chipActive)} aria-pressed={video} onClick={() => { dispatch({ type: video ? "leave-video-mode" : "enter-video-mode" }); }}>
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><rect x="1.5" y="4" width="9" height="8" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.3" /><path d="m10.5 7 4-2v6l-4-2z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /></svg>
          Video generation <span className={styles.h3}>H3</span>
        </button>
        {["Document", "Website", "Image Generation", "More"].map((label) => (
          <span key={label} className={cx(styles.chip, styles.chipInert)} role="button" aria-disabled="true" title={INERT_TITLE}>{label}</span>
        ))}
      </div>
    </div>
  );
}
