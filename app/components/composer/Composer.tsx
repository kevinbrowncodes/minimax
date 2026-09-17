"use client";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useReducer, useRef, useState, type ChangeEvent, type DragEvent, type KeyboardEvent } from "react";
import Link from "next/link";
import { agentSkill, canSend, durationOptions, extensionOf, initialComposer, maxAdded, modelLabel, overlapOptions, paramsLabel, reduceComposer, skillClipSeconds, type AgentSkill, type ComposerImage, type ExtendSource, type InitialRequest } from "@/lib/composer-state";
import { formatNotBefore, toLocalInput } from "@/lib/queue-view";
import { ordinal } from "@/lib/todo-steps";
import { cx } from "@/lib/cx";
import { overlapSeconds } from "@/lib/extend";
import type { Capabilities } from "@/lib/job-api";
import { submitAgentRun, submitChain, submitJob } from "@/lib/submit-job";
import { sparkTimeLine } from "@/lib/spark-time";
import { DESCRIPTION_MARKER } from "@/lib/prompt-format";
import { AgentChip } from "./AgentChip";
import { AgentSettingsPanel } from "./AgentSettingsPanel";
import { decide } from "@/lib/agent-decision";
import { IconSettings } from "@/components/shell/icons";
import { chainPlan, segmentPrompt, splitChain } from "@/lib/chain";
import { ChainStrip, type ChainStart } from "./ChainStrip";
import { ACCEPTED_IMAGE_TYPES } from "@/lib/upload-validation";
import { AgentModelMenu, AttachMenu } from "./ComposerMenus";
import { EnvDialog } from "./EnvDialog";
import { useProjects } from "@/components/shell/ProjectsContext";
import { useSettings } from "@/components/shell/SettingsContext";
import { useShell } from "@/components/shell/ShellContext";
import { useNarrow } from "@/lib/use-narrow";
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
  /** STORY_050: an Inbox row of a director run that ended without a prompt (`/?agentRun=`) — the notes back, the chip on, the words shown. */
  readonly initialAgentRun?: { readonly notes: string; readonly message: string; readonly skill: string };
}

/** The home composer (STORY_013): text mode, video mode with references, model, parameters, Send; extend mode (STORY_016). */
export function Composer({ fetchImpl, variant = "home", stop, extend, onStopExtending, initialProjectId, initialText, initialRequest, initialAgentRun }: ComposerProps) {
  const router = useRouter();
  const docked = variant === "docked";
  const textarea = useRef<HTMLTextAreaElement>(null);
  const { projects, openCreate } = useProjects();
  const { notify } = useShell();
  // STORY_040: the video-creator plugin's switch — off is a text-only workstation: no mode chip, no video controls
  const { settings, update: updateSettings } = useSettings();
  const narrow = useNarrow();
  const videoEnabled = settings.videoEnabled;
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
  const [popover, setPopover] = useState<"params" | "model" | "attach" | "agent" | "agent-skill" | undefined>(undefined);
  const runController = useRef<AbortController | undefined>(undefined); // STORY_050: the director run in flight
  const [agentSettingsOpen, setAgentSettingsOpen] = useState(false); // STORY_051: the ⚙ panel
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

  // STORY_050: the director skills for the chip's menu; the chosen one is the setting's, else the reopened run's, else the first
  useEffect(() => {
    let cancelled = false;
    void doFetch("/api/agent/skills")
      .then(async (res) => {
        const body: unknown = res.ok ? await res.json() : undefined;
        const list = typeof body === "object" && body !== null ? (body as { skills?: unknown }).skills : undefined;
        return Array.isArray(list) ? (list as AgentSkill[]) : [];
      })
      .catch(() => [] as AgentSkill[])
      .then((list) => {
        if (!cancelled) dispatch({ type: "agent-skills", skills: list, chosen: settings.agentSkill ?? initialAgentRun?.skill });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once on mount
  }, []);
  useEffect(() => {
    if (initialAgentRun) dispatch({ type: "agent-notes", notes: initialAgentRun.notes, message: initialAgentRun.message });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once on mount
  }, []);
  // a run in flight is stopped when the composer goes away (StrictMode's simulated unmount included — the controller lives in a ref)
  useEffect(() => () => { runController.current?.abort(); }, []);

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

  // STORY_050: the director run — the photo and the notes to the skill; the reply into the box, or the words of a refusal
  const runAgent = async (): Promise<void> => {
    const controller = new AbortController();
    runController.current?.abort();
    runController.current = controller;
    dispatch({ type: "agent-start" });
    const result = await submitAgentRun(state, doFetch, controller.signal);
    if (controller !== runController.current) return; // a later run or an unmount superseded this one
    runController.current = undefined;
    const decision = decide(settings.agentConfirm, result);
    if (decision === "queue" && result.kind === "prompt") {
      // STORY_051: straight through — the prompt is posted as a Send would post it, the box never shows it; the write starts before the paint
      const clip = skillClipSeconds(agentSkill(state));
      const sent = await submitJob({ ...state, ...(clip === undefined ? {} : { durationSeconds: clip }) }, doFetch, { prompt: result.prompt, images: state.images, ...(state.notBefore === undefined ? {} : { notBefore: state.notBefore }), ...(state.queueId === undefined ? {} : { replaces: state.queueId }) });
      if (sent.ok) {
        dispatch({ type: "agent-reply", prompt: "", findings: [] });
        notify(sent.position === undefined ? "Queued — the director's prompt" : `Queued — the director's prompt, ${ordinal(sent.position)} in line`);
        router.push(state.queueId === undefined ? `/task/${encodeURIComponent(sent.id)}` : "/scheduled");
        return;
      }
      dispatch({ type: "agent-reply", prompt: result.prompt, findings: result.findings, ...(clip === undefined ? {} : { clipSeconds: clip }) });
      dispatch({ type: "error", error: { message: sent.message, ...(sent.field === undefined ? {} : { field: sent.field }) } });
      return;
    }
    if (result.kind === "prompt") {
      dispatch({ type: "agent-reply", prompt: result.prompt, findings: result.findings, notSent: decision === "review-not-sent", ...(skillClipSeconds(agentSkill(state)) === undefined ? {} : { clipSeconds: skillClipSeconds(agentSkill(state)) }) });
      requestAnimationFrame(() => {
        const box = textarea.current;
        if (!box) return;
        box.focus();
        box.setSelectionRange(0, 0);
        box.scrollTop = 0; // the caret at the start is not enough: setting the value scrolled the box to its end
      });
      return;
    }
    if (result.kind === "stopped") { dispatch({ type: "agent-stopped" }); return; }
    if (result.kind === "refusal") dispatch({ type: "agent-declined", message: result.message });
    else dispatch({ type: "agent-failed", message: result.message });
    window.dispatchEvent(new Event("minimax:agent-runs")); // the Shell reloads the Inbox's rows
  };
  const stopAgent = (): void => {
    runController.current?.abort();
  };

  const send = async (): Promise<void> => {
    if (!canSend(state)) return;
    if (state.mode === "video" && state.agent.on) {
      await runAgent();
      return;
    }
    if (state.mode !== "video") {
      // BACKLOG_006 wires the text mode to a local text model; until then it says so (STORY_026)
      dispatch({ type: "error", error: { message: "Text chat is not connected to the Spark yet — pick Video generation" } });
      return;
    }
    dispatch({ type: "submit-start" });
    if (chain !== undefined && plan !== undefined) {
      if (!plan.fits) {
        dispatch({ type: "submit-end" });
        return;
      }
      // STORY_044: Send all — the segments one after another, each an extension of the id just answered; the last page is the whole video's
      const prompts = chain.segments.map((script) => segmentPrompt(chain.scene, script));
      const sent = await submitChain(state, prompts, doFetch);
      if (sent.ok) {
        notify(`Queued — ${String(sent.ids.length)} segments, ≈ ${plan.totalSeconds.toFixed(1)} s`);
        router.push(`/task/${encodeURIComponent(sent.ids[sent.ids.length - 1] ?? "")}`);
        return;
      }
      // a refusal mid-way: the accepted segments stay in the line; the composer keeps the scene and the unsent scripts, in extend mode against the last accepted one (its pending tile), so Send all again continues the chain
      const lastId = sent.sent[sent.sent.length - 1];
      if (lastId !== undefined) {
        const accepted = plan.segments[sent.sent.length - 1];
        const title = await doFetch(`/api/history/${encodeURIComponent(lastId)}`).then(async (res) => (res.ok ? ((await res.json()) as { title?: string }).title : undefined)).catch(() => undefined);
        dispatch({ type: "extend-from", source: { id: lastId, title: title ?? lastId.slice(0, 8), durationSeconds: accepted?.joinedSeconds ?? state.durationSeconds, ratio: state.ratio, resolution: state.resolution, model: state.model, posterUrl: `/api/jobs/${encodeURIComponent(lastId)}/poster`, pending: true } });
        dispatch({ type: "text", text: [chain.scene, ...chain.segments.slice(sent.index)].filter((part) => part !== "").join("\n\n") });
      }
      dispatch({ type: "error", error: { message: `Segment ${String(sent.index + 1)} was not sent: ${sent.message}`, ...(sent.field === undefined ? {} : { field: sent.field }) } });
      return;
    }
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
    if (event.key === "Enter" && !event.shiftKey && !stop && !state.agent.running) {
      event.preventDefault();
      void send();
    }
  };

  const video = state.mode === "video" && videoEnabled;
  const caps = state.capabilities;
  const extending = state.extend;
  // STORY_044: two or more "[0:00-" scripts in the text make a chain; the strip and Send all follow from the text alone
  const split = video ? splitChain(state.text) : undefined;
  const chain = split !== undefined && split.segments.length >= 2 ? split : undefined;
  const ext = extensionOf(caps);
  const plan = chain === undefined ? undefined : chainPlan(chain.segments, { seconds: state.durationSeconds, overlapFrames: state.overlapFrames, extensionMax: caps ? maxAdded(caps, state.overlapFrames) : ext.durationsSeconds.max, maxSourceSeconds: ext.maxSourceSeconds, ...(extending ? { fromSource: extending.durationSeconds } : {}) });
  const chainStart: ChainStart = extending ? { kind: "source", title: extending.title } : state.images.length > 0 ? { kind: "image" } : { kind: "text" };
  // STORY_050: the Agent chip — greyed with a reason when the agent is not configured or the composer is extending a clip
  const agentOn = video && state.agent.on;
  const agentRunning = state.agent.running;
  const agentDisabledReason = extending ? "Agent needs a photo — it directs from the first frame" : caps !== undefined && caps.agent?.configured === false ? caps.agent.reason : undefined;
  const agentModel = caps?.agent?.model;
  // "≈ N min on the Spark": only for a prompt in the model's format (the director's, or one pasted in that shape)
  const sparkLine = video && !agentOn && state.text.includes(DESCRIPTION_MARKER)
    ? sparkTimeLine(plan === undefined ? [{ seconds: state.durationSeconds, fromImage: state.images.length > 0, extension: extending !== undefined }] : plan.segments.map((segment, i) => ({ seconds: segment.seconds, fromImage: i === 0 && !extending && state.images.length > 0, extension: i > 0 || extending !== undefined })))
    : undefined;

  return (
    <>
      <EnvDialog open={envOpen} onClose={() => { setEnvOpen(false); }} fetchImpl={fetchImpl} />
      <AgentSettingsPanel open={agentSettingsOpen} confirm={settings.agentConfirm} modelLabel={agentModel?.label ?? "—"} narrow={narrow} onClose={() => { setAgentSettingsOpen(false); }} onSave={(confirm) => { updateSettings({ agentConfirm: confirm }); setAgentSettingsOpen(false); notify("Saved"); }} />
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
          <div className={styles.continuation} data-testid="continuation" data-pending={extending.pending === true}>
            {extending.pending === true ? (
              <span className={cx(styles.continuationPoster, styles.continuationPending)} aria-hidden="true">…</span>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element -- the source's poster, served by our own route
              <img className={styles.continuationPoster} src={extending.posterUrl} alt="" />
            )}
            <div className={styles.continuationText}>
              <span className={styles.continuationTitle}>Continues · {extending.durationSeconds.toFixed(1)} s{extending.pending === true ? " (not finished yet — the extension waits for it)" : ""}</span>
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
            {state.images.length < (agentOn ? 1 : (caps?.referenceImages.max ?? 2)) ? (
              <button type="button" className={styles.tile} onClick={() => fileInput.current?.click()} aria-label={agentOn ? "Add the photo" : "Add reference image"} disabled={agentRunning}>
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
            readOnly={agentRunning}
            onChange={(event) => { dispatch({ type: "text", text: event.target.value }); }}
            onKeyDown={onKeyDown}
          />
        </div>
        {agentRunning ? <div className={styles.agentStatus} role="status" data-testid="agent-status">Thinking…</div> : null}
        {!agentRunning && state.agent.notice?.tone === "warn" ? <div className={styles.agentWarn} role="status" data-testid="agent-findings">▲ {state.agent.notice.message}</div> : null}
        {!agentRunning && state.agent.notice?.tone === "info" ? <div className={styles.agentInfo} role="status" data-testid="agent-info">{state.agent.notice.message}</div> : null}
        {agentOn && state.images.length === 0 && !agentRunning ? <div className={styles.agentInfo} data-testid="agent-hint">Attach the photo the director starts from.</div> : null}
        {plan !== undefined ? (
          <ChainStrip plan={plan} start={chainStart} maxSourceSeconds={ext.maxSourceSeconds} overlapFrames={state.overlapFrames} overlapOptions={ext.overlapFrames.options.map((frames) => ({ frames, label: `${overlapSeconds(frames)} s` }))} onOverlap={(overlapFrames) => { dispatch({ type: "overlap", overlapFrames }); }} />
        ) : null}
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
              <AgentChip
                on={state.agent.on}
                skills={state.agent.skills}
                skillId={state.agent.skillId}
                disabledReason={agentDisabledReason}
                busy={agentRunning}
                menuOpen={popover === "agent-skill"}
                narrow={narrow}
                onToggle={() => { dispatch({ type: "agent-toggle" }); setPopover(undefined); }}
                onMenu={() => { setPopover(popover === "agent-skill" ? undefined : "agent-skill"); }}
                onSkill={(id) => { dispatch({ type: "agent-skill", skillId: id }); setPopover(undefined); updateSettings({ agentSkill: id }); }}
                onManage={() => { setPopover(undefined); router.push("/plugins?tab=Skills"); }}
              />
              {agentOn ? (
                // STORY_051: Agent settings — Confirm before generating
                <button type="button" className={styles.agentIconButton} aria-label="Agent settings" disabled={agentRunning} onClick={() => { setAgentSettingsOpen(true); setPopover(undefined); }}><IconSettings /></button>
              ) : null}
              <span style={{ position: "relative" }} className={styles.modelWrap} data-popover="model">
                <button type="button" className={styles.pill} aria-haspopup="menu" aria-expanded={popover === "model"} aria-label={`Model: ${modelLabel(state)}`} onClick={() => { setPopover(popover === "model" ? undefined : "model"); }} disabled={!caps || extending !== undefined || agentRunning} title={extending ? FIXED_NOTE : undefined}>
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
                <button type="button" className={styles.pill} aria-haspopup="dialog" aria-expanded={popover === "params"} aria-label={`Video parameters: ${paramsLabel(state)}`} onClick={() => { setPopover(popover === "params" ? undefined : "params"); }} disabled={!caps || agentRunning}>
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
              <button type="button" className={styles.inertModel} aria-label={agentOn && agentModel ? `Agent model: ${agentModel.label}` : "MiniMax-M3"} aria-haspopup="menu" aria-expanded={popover === "agent"} disabled={agentRunning} onClick={() => { setPopover(popover === "agent" ? undefined : "agent"); }}>{agentOn && agentModel ? agentModel.label : "MiniMax-M3"} <span aria-hidden="true">⌄</span></button>
              {popover === "agent" ? <AgentModelMenu onClose={() => { setPopover(undefined); }} {...(agentOn && agentModel ? { model: agentModel } : {})} /> : null}
            </span>
            {video && !docked && !extending ? (
              // STORY_041: Run at… — hold the request in the queue until a time; set, it reads "Not before …" with a ×
              <span className={styles.runAtWrap} data-popover="run-at">
                <button type="button" className={cx(styles.runAtButton, state.notBefore !== undefined && styles.runAtButtonOn)} aria-label={state.notBefore === undefined ? "Run at" : `Run at: ${formatNotBefore(state.notBefore)}`} aria-expanded={runAtOpen} disabled={agentRunning} onClick={() => { setRunAtOpen((o) => !o); }}>
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
                    <span className={styles.runAtNote}>Waits in the queue until then — the queue runs inside MiniMax Local&apos;s server, browser or no browser.</span>
                  </span>
                ) : null}
              </span>
            ) : null}
            {agentRunning ? (
              <button type="button" className={styles.send} aria-label="Stop the agent" onClick={stopAgent}>
                <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><rect x="4" y="4" width="8" height="8" rx="1.5" fill="currentColor" /></svg>
              </button>
            ) : stop ? (
              <button type="button" className={styles.send} aria-label="Stop generation" disabled={stop.pending} onClick={stop.onStop}>
                <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><rect x="4" y="4" width="8" height="8" rx="1.5" fill="currentColor" /></svg>
              </button>
            ) : (
              <button type="button" className={cx(styles.send, plan !== undefined && styles.sendAll)} aria-label={plan === undefined ? "Send message" : "Send all"} disabled={!canSend(state) || (plan !== undefined && !plan.fits)} onClick={() => void send()}>
                {plan === undefined ? null : "Send all"}
                <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 13V3.5M4.5 7 8 3.5 11.5 7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            )}
          </div>
        </div>
      </div>
      {sparkLine !== undefined ? <div className={styles.sparkLine} data-testid="spark-time">{sparkLine}</div> : null}
      {!agentRunning && state.agent.notice?.tone === "alert" ? (
        <div className={styles.error} role="alert" data-testid="agent-alert">
          <span aria-hidden="true">ⓘ</span> {state.agent.notice.message}
        </div>
      ) : null}
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
