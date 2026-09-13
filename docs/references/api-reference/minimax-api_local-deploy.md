> ## Documentation Index
> Fetch the complete documentation index at: https://platform.minimax.io/docs/llms.txt
> Use this file to discover all available pages before exploring further.

# Run and self-host MiniMax Open Models

> Choose a local or self-hosted path for MiniMax-M3, MiniMax-M2.7, MiniMax Music 3, and MiniMax H3.

MiniMax provides open-weight models for language, multimodal understanding, music generation, and audiovisual generation. This guide summarizes the official deployment baselines and links to an end-to-end workflow for each model.

<Note>
  This section primarily covers **self-hosted deployment** on servers or clusters. The H3 page also provides a ComfyUI local-workflow path. You provide the hardware, operate the runtime, configure access control when applicable, and implement content safeguards. For a managed service, elastic scaling, or the complete MiniMax Platform feature set, use the [MiniMax API](/docs/guides/quickstart-preparation).
</Note>

## Choose a model

| Model                                           | Task                                                       | Native model capability                                          | Covered by this deployment guide                                                                                    | Reference configuration                                                                           | Status                               |
| :---------------------------------------------- | :--------------------------------------------------------- | :--------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------ | :------------------------------------------------------------------------------------------------ | :----------------------------------- |
| [MiniMax-M3](/docs/guides/local-deploy-m3)           | Agents, coding, long context, and multimodal understanding | Text, image, and video input with text output                    | SGLang OpenAI-compatible Chat Completions; see the model page for the verified capability matrix                    | 8 × B200, MXFP8                                                                                   | Experimental                         |
| [MiniMax-M2.7](/docs/guides/local-deploy-m2-7)       | Agents, software engineering, and existing M2.7 workflows  | Text input and output, reasoning, and tool calls                 | SGLang OpenAI-compatible Chat Completions                                                                           | 4 × high-memory NVIDIA GPUs with TP 4; no uniform official minimum GPU memory is published        | Preview                              |
| [MiniMax Music 3](/docs/guides/local-deploy-music-3) | Complete songs from lyrics and a music description         | Lyrics and music-description input with stereo audio output      | SGLang-Omni non-streaming Speech API                                                                                | 1 × H200 reference sample; other capacities are unverified                                        | Preview                              |
| [MiniMax H3](/docs/guides/local-deploy-h3)           | Audiovisual generation from text, keyframes, or references | Text, image, video, and audio conditions with audiovisual output | ComfyUI-native T2V/I2V/R2V workflows and an SGLang H3-Base API; excludes H3-Context-IR and the complete 2K Workflow | ComfyUI `0.30.0+` with no published minimum GPU memory; SGLang reference: 8 × B200 with Ulysses 8 | ComfyUI native / SGLang Experimental |

The status describes the maturity of the documentation baseline, not the product lifecycle of the model itself:

* **Stable**: Uses a fixed runtime version and provides a reproducible reference command.
* **Preview**: An official deployment path is available, but the upstream installation method or some capabilities are still changing.
* **Experimental**: Depends on a prerelease runtime, or some hardware combinations have not completed end-to-end validation.

<Warning>
  "Open weights" does not mean that every model uses the same license. Before deployment, redistribution, or commercial use, read the complete License and Acceptable Use Policy linked from the model page. Inference-framework support does not grant additional model usage rights.
</Warning>

## Self-hosting boundaries

Self-hosting keeps model weights, input data, and the inference service on infrastructure that you control. It also means that:

* You are responsible for capacity planning, scaling, monitoring, recovery, and upgrades.
* Quickstarts listen only on the local machine by default. Before exposing a service, configure authentication, TLS, network isolation, and remote-media access restrictions.
* Open weights do not include MiniMax Platform managed files, caching, content safeguards, or platform-only workflows.
* Community quantizations, converted weights, and other inference frameworks are outside this section's validated scope unless a model page explicitly lists them.

## Before you deploy

1. Read the target model's License, open-release scope, and verified capabilities.
2. Prepare the GPU, host memory, disk, driver, and CUDA environment specified on the model page.
3. Pin the model revision, inference runtime version, or image digest. Do not let production deployments drift with `main`, `dev`, or `latest`.
4. Prepare a Hugging Face cache or offline weights. For mirrors in mainland China, use only the official source listed on the model page.
5. Complete the health check and minimal request before applying quantization, parallelism, offloading, or throughput tuning.

<Tip>
  Each model page provides the reference baseline adopted by the MiniMax documentation. SGLang Cookbook configurators can generate additional hardware, quantization, and topology combinations, but a generated result may be marked Unverified. Do not reuse parameters from different hardware without regenerating the complete configuration.
</Tip>

## Support and validation scope

Each model page identifies the model revision, runtime version, reference hardware, verified capabilities, and last validation date. When official measurements are unavailable, the page says "not published" or "unverified" rather than estimating from adjacent models or community results.
