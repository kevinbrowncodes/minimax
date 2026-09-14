# spark/comfyui/Dockerfile — ComfyUI at a pinned tag with aarch64 cu130 PyTorch, for the DGX Spark (GB10, sm_121).
#
# Nothing is installed on the host: this image is the whole serving stack (STORY_005, owner's rule 2026-09-12).
# Weights, outputs and templates are bind mounts (see compose.yaml). The image runs as the host user's uid so the
# mounted files stay owned by the owner.
# Pinned by digest as well as tag (multi-arch manifest list, read 2026-09-12) so a re-tagged upstream image cannot change the build.
ARG CUDA_IMAGE=nvidia/cuda:13.0.2-runtime-ubuntu24.04@sha256:6a0e31b59e70890446f2c17356d6efc0d54260090a8c63d6ca7c2ad049db95d2
FROM ${CUDA_IMAGE}

ARG COMFYUI_TAG=v0.35.1
ARG COMFYUI_REPO=https://github.com/comfyanonymous/ComfyUI.git
ARG TORCH_INDEX=https://download.pytorch.org/whl/cu130
ARG TORCH_VERSION=2.11.0+cu130
ARG TORCHVISION_VERSION=0.26.0+cu130
ARG TORCHAUDIO_VERSION=2.11.0+cu130
ARG UID=1000
ARG GID=1000

ENV DEBIAN_FRONTEND=noninteractive PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1 PIP_DISABLE_PIP_VERSION_CHECK=1

RUN apt-get update \
 && apt-get install -y --no-install-recommends git curl ca-certificates python3 python3-venv \
 && rm -rf /var/lib/apt/lists/*

# Ubuntu 24.04 images ship an "ubuntu" user at uid/gid 1000; retire it so the host user's ids can be reused.
RUN (userdel -r ubuntu 2>/dev/null || true) && (groupdel ubuntu 2>/dev/null || true) \
 && groupadd -g "${GID}" comfy && useradd -m -u "${UID}" -g "${GID}" -s /bin/bash comfy \
 && mkdir -p /comfy && chown comfy:comfy /comfy
USER comfy
WORKDIR /comfy

# The venv keeps ComfyUI's dependencies apart from the image's system Python.
RUN python3 -m venv /comfy/venv && /comfy/venv/bin/pip install --quiet --upgrade pip

# PyTorch first, pinned, from the cu130 index (the only index with aarch64 + CUDA 13 wheels).
RUN /comfy/venv/bin/pip install --quiet --extra-index-url "${TORCH_INDEX}" \
      "torch==${TORCH_VERSION}" "torchvision==${TORCHVISION_VERSION}" "torchaudio==${TORCHAUDIO_VERSION}"

# ComfyUI at the pinned tag, then its own pinned requirements (torch lines are already satisfied and left alone).
RUN git clone --quiet --depth 1 --branch "${COMFYUI_TAG}" "${COMFYUI_REPO}" /comfy/ComfyUI \
 && /comfy/venv/bin/pip install --quiet -r /comfy/ComfyUI/requirements.txt \
 && /comfy/venv/bin/pip install --quiet "huggingface_hub[cli]"

# CHORE_007: kijai's ComfyUI-KJNodes (GPL-3.0, as ComfyUI) at a pinned commit, so reference workflows that use its
# Get/Set wiring, ImageBatchExtendWithOverlap, CreateFadeMaskAdvanced and MiniMax memory patches run as published
# (the PR #15375 author's masked-extension example is STORY_020's control run). Its SageAttention nodes need a package
# this image does not carry; the workflows that use them bypass those nodes. Fetched shallow at the commit, .git dropped.
ARG KJNODES_REPO=https://github.com/kijai/ComfyUI-KJNodes.git
ARG KJNODES_COMMIT=d3cfe21625e5170126ce06fbfcfe1d88108688c3
RUN mkdir -p /comfy/ComfyUI/custom_nodes/ComfyUI-KJNodes \
 && cd /comfy/ComfyUI/custom_nodes/ComfyUI-KJNodes \
 && git init --quiet && git remote add origin "${KJNODES_REPO}" \
 && git fetch --quiet --depth 1 origin "${KJNODES_COMMIT}" && git checkout --quiet FETCH_HEAD \
 && rm -rf .git \
 && /comfy/venv/bin/pip install --quiet -r requirements.txt

# STORY_020: our own nodes (the frame-change measure behind the shot-change check).
COPY --chown=comfy:comfy custom_nodes/ /comfy/ComfyUI/custom_nodes/
COPY --chown=comfy:comfy h3.sh container/ /comfy/bin/
RUN chmod +x /comfy/bin/*.sh && mkdir -p /comfy/templates /comfy/ComfyUI/models /comfy/ComfyUI/output

ENV PATH="/comfy/venv/bin:/comfy/bin:${PATH}" COMFYUI_TAG="${COMFYUI_TAG}"
EXPOSE 8188
WORKDIR /comfy/ComfyUI
ENTRYPOINT ["/comfy/bin/comfyui-entrypoint.sh"]
