"use client";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useReducer, useRef, useState, type ChangeEvent, type DragEvent, type KeyboardEvent } from "react";
import Link from "next/link";
import { canSend, durationOptions, initialComposer, modelLabel, overlapOptions, paramsLabel, reduceComposer, type ComposerImage, type ExtendSource, type InitialRequest } from "@/lib/composer-state";
import { formatNotBefore, toLocalInput } from "@/lib/queue-view";
import { ordinal } from "@/lib/todo-steps";
import { cx } from "@/lib/cx";
import { overlapSeconds } from "@/lib/extend";
import type { Capabilities } from "@/lib/job-api";
import { submitJob } from "@/lib/submit-job";
import { ACCEPTED_IMAGE_TYPES } from "@/lib/upload-validation";
import { AgentModelMenu, AttachMenu } from "./ComposerMenus";
import { EnvDialog } from "./EnvDialog";
import { useProjects } from "@/components/shell/ProjectsContext";
import { useSettings } from "@/components/shell/SettingsContext";
import { useShell } from "@/components/shell/ShellContext";
import { applySkill, type Skill } from "@/lib/skills";
import { IconProject } from "@/components/shell/icons";
import { Showcase } from "./Showcase";
import styles from "./composer.module.css";

const PLACEHOLDER = "Enter message... (use / for commands)";
const EXTEND_PLACEHOLDER = "Describe what happens next…";
const FIXED_NOTE = "fixed by the video being extended";

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
  /** "docked" = the task page's composer (task-submitted@1440): no mode chips, video mode from the start, no tag. */
  readonly variant?: "home" | "docked";
  /** While a job runs, Send becomes "Stop generation" (task-generating-000s@1440). */
  readonly stop?: { readonly pending: boolean; readonly onStop: () => void };
  /** Extend mode (STORY_016): the finished video to continue; the page owns the flag and clears it through onStopExtending. */
  readonly extend?: ExtendSource;
  readonly onStopExtending?: () => void;
  /** STORY_031: start in this project (the row's New task, `/?project=`; a task's own project on its docked composer). */
  readonly initialProjectId?: string;
  /** STORY_040: start with this text (Management › Skills › Use, `/?skill=`). */
  readonly initialText?: string;
  /** STORY_041: Edit of a waiting request (`/?queue=`) — the request as sent; Send replaces its queue entry. */
  readonly initialRequest?: InitialRequest;
}

/** The home composer (STORY_013): text mode, video mode with references, model, parameters, Send; extend mode (STORY_016). */
export function Composer({ fetchImpl, variant = "home", stop, extend, onStopExtending, initialProjectId, initialText, initialRequest }: ComposerProps) {
  const router = useRouter();
  const docked = variant === "docked";
  const textarea = useRef<HTMLTextAreaElement>(null);
  const { projects, openCreate } = useProjects();
  const { notify } = useShell();
  // STORY_040: the video-creator plugin's switch — off is a text-only workstation: no mode chip, no video controls
  const videoEnabled = useSettings().settings.videoEnabled;
  const [state, dispatch] = useReducer(reduceComposer, { docked, initialProjectId, initialText, initialRequest }, (init) => {
    // STORY_041: an Edit starts in video mode with the request's words, project and run-at; its parameters and images follow once capabilities arrive
    const request = init.initialRequest;
    const base = initialComposer(init.initialProjectId ?? request?.projectId, init.initialText ?? request?.prompt ?? "", request ? { queueId: request.queueId, ...(request.notBefore === undefined ? {} : { notBefore: request.notBefore }) } : {});
    return init.docked || request ? reduceComposer(base, { type: "enter-video-mode" }) : base;
  });
  const [runAtOpen, setRunAtOpen] = useState(false); // STORY_041: the Run at… control beside Send
  const requestApplied = useRef(false);
  const [skills, setSkills] = useState<readonly Skill[]>([]);
  // STORY_031: the chip names the chosen project; a project that no longer exists shows nothing (the route would refuse it)
  const project = state.projectId === undefined ? undefined : projects.find((p) => p.id === state.projectId);
  const [popover, setPopover] = useState<"params" | "model" | "attach" | "agent" | undefined>(undefined);
  const [envOpen, setEnvOpen] = useState(false); // STORY_035
  const [showcaseDismissed, setShowcaseDismissed] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const urls = useRef(new Map<string, string>());
  const doFetch = fetchImpl ?? fetch;

  // STORY_040: the skills for + › Skills (the built-in first)
  useEffect(() => {
    let cancelled = false;
    void doFetch("/api/skills")
      .then(async (res) => (res.ok ? ((await res.json()) as { skills: Skill[] }).skills : []))
      .catch(() => [] as Skill[])
      .then((list) => {
        if (!cancelled) setSkills(list);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once on mount
  }, []);

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
        if (!cancelled) dispatch({ type: "capabilities-failed", message: "The Spark's adapter is not reachable — on the Spark, run spark/comfyui/run.sh" });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetch once on mount
  }, []);

  // The page decides when the composer extends a video; the reducer makes the dispatches idempotent (StrictMode-safe).
  useEffect(() => {
    if (extend) {
      dispatch({ type: "extend-from", source: extend });
      textarea.current?.focus();
    } else {
      dispatch({ type: "clear-extend" });
    }
  }, [extend]);

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
      if (event.key === "Escape") { setPopover(undefined); setRunAtOpen(false); }
    };
    const onClick = (event: MouseEvent): void => {
      if (!(event.target instanceof Element) || !event.target.closest("[data-popover]")) { setPopover(undefined); setRunAtOpen(false); }
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

  // STORY_041: once the Spark's capabilities are known, an Edit takes the request's parameters (clamped as a scene is) and its images
  useEffect(() => {
    if (!initialRequest || requestApplied.current || state.capabilities === undefined) return;
    requestApplied.current = true;
    dispatch({ type: "scene", prompt: initialRequest.prompt, ratio: initialRequest.ratio, resolution: initialRequest.resolution, durationSeconds: initialRequest.durationSeconds });
    dispatch({ type: "model", model: initialRequest.model });
    let cancelled = false;
    void Promise.all(initialRequest.images.map(async (image) => {
      const res = await doFetch(image.url).catch(() => undefined);
      if (!res?.ok) return undefined;
      return new File([await res.blob()], image.name, { type: image.type });
    })).then((files) => {
      if (cancelled) return;
      const present = files.filter((f): f is File => f !== undefined);
      if (present.length > 0) addFiles(present);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, when capabilities arrive
  }, [state.capabilities]);
  const onDrop = (event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    setDragging(false);
    if (state.mode !== "video" || state.extend) return;
    addFiles(Array.from(event.dataTransfer.files));
  };
  const stopExtending = (): void => {
    dispatch({ type: "clear-extend" });
    onStopExtending?.();
  };

  const send = async (): Promise<void> => {
    if (!canSend(state)) return;
    if (state.mode !== "video") {
      // BACKLOG_006 wires the text mode to a local text model; until then it says so (STORY_026)
      dispatch({ type: "error", error: { message: "Text chat is not connected to the Spark yet — pick Video generation" } });
      return;
    }
    dispatch({ type: "submit-start" });
    const result = await submitJob(state, doFetch);
    if (result.ok) {
      // STORY_041: a request that went into the line says where it stands; an Edit returns to the queue
      if (result.position !== undefined) notify(`Queued — ${ordinal(result.position)} in line`);
      router.push(state.queueId === undefined ? `/task/${encodeURIComponent(result.id)}` : "/scheduled");
      return;
    }
    dispatch({ type: "error", error: { message: result.message, ...(result.field === undefined ? {} : { field: result.field }) } });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (event.key === "Enter" && !event.shiftKey && !stop) {
      event.preventDefault();
      void send();
    }
  };

  const video = state.mode === "video" && videoEnabled;
  const caps = state.capabilities;
  const extending = state.extend;

  return (
    <>
      <EnvDialog open={envOpen} onClose={() => { setEnvOpen(false); }} fetchImpl={fetchImpl} />
      {state.queueId !== undefined ? (
        // STORY_041: Edit of a waiting request
        <div className={styles.editing} role="status" data-testid="editing-banner">
          Editing a queued job — Send replaces it, Cancel editing keeps it. <Link href="/scheduled" className={styles.editingCancel}>Cancel editing</Link>
        </div>
      ) : null}
    <div className={styles.wrap}>
      <div
        className={cx(styles.card, docked && styles.cardDocked, dragging && styles.cardDrop)}
        onDragOver={(event) => {
          if (video && !extending) {
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
        {video && extending ? (
          <div className={styles.continuation} data-testid="continuation">
            {/* eslint-disable-next-line @next/next/no-img-element -- the source's poster, served by our own route */}
            <img className={styles.continuationPoster} src={extending.posterUrl} alt="" />
            <div className={styles.continuationText}>
              <span className={styles.continuationTitle}>Continues · {extending.durationSeconds.toFixed(1)} s</span>
              <span data-testid="overlap-line">carries its last {overlapSeconds(state.overlapFrames)} s into the new clip</span>
            </div>
            <button type="button" className={styles.continuationRemove} aria-label="Stop extending" onClick={stopExtending}>×</button>
          </div>
        ) : video ? (
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
          {video && !docked ? (
            <span className={styles.tag}>
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><rect x="1" y="3" width="8" height="8" rx="2" fill="currentColor" /><path d="M9 6.5 13 4.5v5L9 7.5z" fill="currentColor" /></svg>
              video-creator
              <button type="button" className={styles.tagRemove} aria-label="Remove video-creator" onClick={() => { dispatch({ type: "leave-video-mode" }); }}>×</button>
            </span>
          ) : null}
          {project && !docked ? (
            <span className={cx(styles.tag, styles.projectTag)} data-testid="project-chip">
              <IconProject />
              {project.name}
              <button type="button" className={styles.tagRemove} aria-label={`Remove project ${project.name}`} onClick={() => { dispatch({ type: "project", projectId: undefined }); }}>×</button>
            </span>
          ) : null}
          <textarea
            ref={textarea}
            className={styles.editor}
            aria-label="Message"
            placeholder={extending ? EXTEND_PLACEHOLDER : PLACEHOLDER}
            value={state.text}
            rows={2}
            onChange={(event) => { dispatch({ type: "text", text: event.target.value }); }}
            onKeyDown={onKeyDown}
          />
        </div>
        <div className={styles.bar}>
          <span style={{ position: "relative" }} data-popover="attach">
            <button type="button" className={styles.iconButton} aria-label="Add attachment" aria-haspopup="menu" aria-expanded={popover === "attach"} onClick={() => { setPopover(popover === "attach" ? undefined : "attach"); }}>+</button>
            {popover === "attach" ? (
              <AttachMenu
                onAddFiles={video && !extending ? () => fileInput.current?.click() : undefined}
                onClose={() => { setPopover(undefined); }}
                projects={projects}
                projectId={state.projectId}
                onProject={(projectId) => { dispatch({ type: "project", projectId }); }}
                onNewProject={() => { openCreate((created) => { dispatch({ type: "project", projectId: created.id }); }); }}
                onEnv={() => { setEnvOpen(true); }}
                skills={skills}
                onUseSkill={(skill) => { dispatch({ type: "text", text: applySkill(skill.template, state.text) }); textarea.current?.focus(); }}
                onManageSkills={(create) => { router.push(create ? "/plugins?tab=Skills&create=1" : "/plugins?tab=Skills"); }}
              />
            ) : null}
          </span>
          {video ? (
            <>
              <span style={{ position: "relative" }} className={styles.modelWrap} data-popover="model">
                <button type="button" className={styles.pill} aria-haspopup="menu" aria-expanded={popover === "model"} aria-label={`Model: ${modelLabel(state)}`} onClick={() => { setPopover(popover === "model" ? undefined : "model"); }} disabled={!caps || extending !== undefined} title={extending ? FIXED_NOTE : undefined}>
                  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><circle cx="7" cy="7" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.3" /><circle cx="7" cy="7" r="2" fill="currentColor" /></svg>
                  {modelLabel(state)}
                  <span aria-hidden="true">⌄</span>
                </button>
                {popover === "model" && caps ? (
                  // the models the Spark serves (STORY_026: no greyed cloud entries)
                  <div className={styles.menu} role="menu" aria-label="Model">
                    {caps.models.map((m) => (
                      <button key={m.id} type="button" role="menuitemradio" aria-checked={state.model === m.id} className={styles.menuItem} onClick={() => { dispatch({ type: "model", model: m.id }); setPopover(undefined); }}>
                        <span>{state.model === m.id ? "● " : ""}{m.label.replace(".0", "")}</span>
                      </button>
                    ))}
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
                      {caps.ratios.map((ratio) => (
                        <button key={ratio} type="button" role="radio" aria-checked={state.ratio === ratio} className={cx(styles.segment, styles.segmentRatio, state.ratio === ratio && styles.segmentSelected)} disabled={extending !== undefined} onClick={() => { dispatch({ type: "ratio", ratio }); }}>
                          <RatioGlyph ratio={ratio} />
                          {ratio}
                        </button>
                      ))}
                    </div>
                    <span className={styles.sectionLabel}>Resolution</span>
                    <div className={styles.track} role="radiogroup" aria-label="Resolution">
                      {caps.resolutions.map((resolution) => (
                        <button key={resolution} type="button" role="radio" aria-checked={state.resolution === resolution} className={cx(styles.segment, state.resolution === resolution && styles.segmentSelected)} disabled={extending !== undefined} onClick={() => { dispatch({ type: "resolution", resolution }); }}>
                          {resolution}
                        </button>
                      ))}
                    </div>
                    {extending ? <span className={styles.fixedNote}>{FIXED_NOTE}</span> : null}
                    <span className={styles.sectionLabel}>{extending ? "Duration (added)" : "Duration"}</span>
                    <div className={styles.track} role="radiogroup" aria-label="Duration">
                      {durationOptions(state).map((seconds) => (
                        <button key={seconds} type="button" role="radio" aria-checked={state.durationSeconds === seconds} className={cx(styles.segment, state.durationSeconds === seconds && styles.segmentSelected)} onClick={() => { dispatch({ type: "duration", durationSeconds: seconds }); }}>
                          {extending ? "+" : ""}{String(seconds)}s
                        </button>
                      ))}
                    </div>
                    {extending ? (
                      <>
                        <span className={styles.sectionLabel}>Overlap (what the new clip starts from)</span>
                        <div className={styles.track} role="radiogroup" aria-label="Overlap">
                          {overlapOptions(state).map((option) => (
                            <button key={option.frames} type="button" role="radio" aria-checked={state.overlapFrames === option.frames} className={cx(styles.segment, state.overlapFrames === option.frames && styles.segmentSelected)} onClick={() => { dispatch({ type: "overlap", overlapFrames: option.frames }); }}>
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </>
                    ) : null}
                  </div>
                ) : null}
              </span>
            </>
          ) : null}
          <div className={styles.barRight}>
            <span style={{ position: "relative" }} data-popover="agent">
              <button type="button" className={styles.inertModel} aria-label="MiniMax-M3" aria-haspopup="menu" aria-expanded={popover === "agent"} onClick={() => { setPopover(popover === "agent" ? undefined : "agent"); }}>MiniMax-M3 <span aria-hidden="true">⌄</span></button>
              {popover === "agent" ? <AgentModelMenu onClose={() => { setPopover(undefined); }} /> : null}
            </span>
            {video && !docked && !extending ? (
              // STORY_041: Run at… — hold the request in the queue until a time; set, it reads "Not before …" with a ×
              <span className={styles.runAtWrap} data-popover="run-at">
                <button type="button" className={cx(styles.runAtButton, state.notBefore !== undefined && styles.runAtButtonOn)} aria-label={state.notBefore === undefined ? "Run at" : `Run at: ${formatNotBefore(state.notBefore)}`} aria-expanded={runAtOpen} onClick={() => { setRunAtOpen((o) => !o); }}>
                  {state.notBefore === undefined ? "Run at…" : formatNotBefore(state.notBefore)}
                </button>
                {state.notBefore !== undefined ? <button type="button" className={styles.runAtClear} aria-label="Clear the run-at time" onClick={() => { dispatch({ type: "not-before", notBefore: undefined }); setRunAtOpen(false); }}>×</button> : null}
                {runAtOpen ? (
                  <span className={styles.runAtPopover} data-testid="run-at-picker">
                    <input
                      type="datetime-local"
                      aria-label="Run at time"
                      defaultValue={toLocalInput(state.notBefore)}
                      onChange={(event) => {
                        const value = event.target.value;
                        if (value === "" || Number.isNaN(Date.parse(value))) return;
                        dispatch({ type: "not-before", notBefore: new Date(value).toISOString() });
                      }}
                    />
                    <span className={styles.runAtNote}>Waits in the queue until then — the queue runs inside MiniMax Local while it is open.</span>
                  </span>
                ) : null}
              </span>
            ) : null}
            {stop ? (
              <button type="button" className={styles.send} aria-label="Stop generation" disabled={stop.pending} onClick={stop.onStop}>
                <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><rect x="4" y="4" width="8" height="8" rx="1.5" fill="currentColor" /></svg>
              </button>
            ) : (
              <button type="button" className={styles.send} aria-label="Send message" disabled={!canSend(state)} onClick={() => void send()}>
                <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 13V3.5M4.5 7 8 3.5 11.5 7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            )}
          </div>
        </div>
      </div>
      {state.error ? (
        <div className={styles.error} role="alert" data-field={state.error.field}>
          <span aria-hidden="true">ⓘ</span> {state.error.message}
        </div>
      ) : null}
      {state.capabilitiesError ? <div className={styles.error} role="alert">{state.capabilitiesError}</div> : null}
      {docked || video || !videoEnabled ? null : (
        // one mode chip (STORY_026): the reference's Document / Website / Image Generation / More are gone
        <div className={styles.chips} role="group" aria-label="Modes">
          <button type="button" className={styles.chip} onClick={() => { dispatch({ type: "enter-video-mode" }); }}>
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><rect x="1.5" y="4" width="9" height="8" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.3" /><path d="m10.5 7 4-2v6l-4-2z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /></svg>
            Video generation <span className={styles.h3}>H3</span>
          </button>
        </div>
      )}
      {docked || !video || showcaseDismissed || extending ? null : (
        <Showcase
          onScene={(scene) => { dispatch({ type: "scene", prompt: scene.prompt, ratio: scene.ratio, resolution: scene.resolution, durationSeconds: scene.durationSeconds }); textarea.current?.focus(); }}
          onDismiss={() => { dispatch({ type: "clear-scene" }); setShowcaseDismissed(true); }}
        />
      )}
    </div>
    </>
  );
}
