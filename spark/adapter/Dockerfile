# spark/adapter/Dockerfile — the job-API adapter (STORY_006). Zero runtime dependencies: the sources run on Node 26's
# type stripping, so the image is the base plus the package and the graph template. Build context: the repo root.
ARG NODE_IMAGE=node:26-bookworm-slim@sha256:cd9f682fa2885cd1056e830424764158570061c59736a1da836bc3d73df095ae
FROM ${NODE_IMAGE}
ENV NODE_ENV=production
WORKDIR /adapter
COPY spark/adapter/package.json spark/adapter/tsconfig.json ./
COPY spark/adapter/src ./src
COPY spark/comfyui/h3_t2v_prompt.json /graph/h3_t2v_prompt.json
RUN mkdir -p /comfy/output /comfy/adapter && chown -R node:node /comfy /adapter
USER node
ENV GRAPH_TEMPLATE=/graph/h3_t2v_prompt.json OUTPUT_DIR=/comfy/output STORE_FILE=/comfy/adapter/jobs.json COMFY_URL=http://comfyui:8188 ADAPTER_PORT=4020
EXPOSE 4020
CMD ["node", "src/main.ts"]
