> ## Documentation Index
> Fetch the complete documentation index at: https://platform.minimax.io/docs/llms.txt
> Use this file to discover all available pages before exploring further.

# Create Video Regeneration Task

> Regenerate a source video that meets the MiniMax-H3 768P output specifications into a 2K video.

Two methods are supported (choose one):

* **By task ID**: pass an existing generation task's `source_task_id`
* **By source video**: pass `base_video` in `content`

<Warning>
  This endpoint only regenerates videos that meet the MiniMax-H3 768P output specifications to produce 2K output. It does not perform general-purpose processing of arbitrary videos.
</Warning>

<Note>
  Regeneration tasks have `task_type=regeneration` and can be managed through the shared H3 [Query Task](/docs/api-reference/video-generation-v2-query), [List Tasks](/docs/api-reference/video-generation-v2-list), and [Cancel or Delete Task](/docs/api-reference/video-generation-v2-delete) endpoints.
</Note>


## OpenAPI

````yaml api-reference/video/generation/api/v2-video-generation.json POST /v2/video_regeneration
openapi: 3.1.0
info:
  title: MiniMax API
  description: MiniMax video generation V2 (Hailuo-03) API
  license:
    name: MIT
  version: 2.0.0
servers:
  - url: https://api.minimax.io
security:
  - bearerAuth: []
paths:
  /v2/video_regeneration:
    post:
      tags:
        - Video V2
      summary: Create Video Regeneration Task
      description: >-
        Create a video regeneration task: regenerate a source video that meets
        the MiniMax-H3 768P output specifications as a 2K video. Two input modes
        are supported; you must provide **exactly one** of `source_task_id` or
        `content` (with a `base_video` item) — providing both or neither returns
        a parameter error:


        - **Regenerate by task ID (`source_task_id`)**: pass the
        `source_task_id` of an existing succeeded `/v2/video_generation` task to
        regenerate from its output. This mode requires whitelist access; the
        source task must be owned by the current account, in `succeeded` status,
        and still within the 7-day query window of `/v2/query/video_generation`.
        No `content` is needed.

        - **Regenerate by source video (`base_video`)**: provide exactly one
        `type=video_url`, `role=base_video` source-video item in `content`,
        along with the other inputs used to generate that 768P video.


        This is an asynchronous endpoint: on success it returns a `task_id`;
        poll [Query Task](/api-reference/video-generation-v2-query) for status.
        `task_type` is `regeneration`. Currently supported model: `MiniMax-H3`.
      operationId: videoRegenerationV2Create
      parameters:
        - name: Content-Type
          in: header
          required: true
          description: Media type of the request body. Set it to `application/json`.
          schema:
            type: string
            enum:
              - application/json
            default: application/json
      requestBody:
        content:
          application/json:
            schema:
              oneOf:
                - $ref: '#/components/schemas/VideoRegenerationSourceTaskReq'
                - $ref: '#/components/schemas/VideoRegenerationBaseVideoReq'
            examples:
              Regenerate by task ID (source_task_id):
                value:
                  model: MiniMax-H3
                  source_task_id: '424010985738629'
                  resolution: 2K
              Regenerate by source video (base_video) · t2va:
                value:
                  model: MiniMax-H3
                  content:
                    - type: text
                      text: >-
                        Epic space-opera theatrical teaser: a female captain
                        stands alone before a massive observation window as the
                        last fleet gathers and jumps away in a blinding flash,
                        the bridge shaking, leaving her behind.
                    - type: video_url
                      video_url:
                        url: https://your-cdn.example.com/h3-t2va-768p.mp4
                      role: base_video
                  resolution: 2K
              Regenerate by source video (base_video) · i2va:
                value:
                  model: MiniMax-H3
                  content:
                    - type: text
                      text: >-
                        Pull focus to the people in the background and add more
                        steam to the ramen bowl.
                    - type: image_url
                      image_url:
                        url: >-
                          https://cdn.hailuoai.com/prod/hailuo_demo/testsets/H3_AA_I2VA/gallery/sr_v17_variants_seed42_43_20260724/inputs/4a3a90bf9100_KDmcbkhzYo5sjjxr9FqcVmWVnzb.png
                      role: first_frame
                    - type: video_url
                      video_url:
                        url: https://your-cdn.example.com/h3-i2va-768p.mp4
                      role: base_video
                  resolution: 2K
              Regenerate by source video (base_video) · r2va:
                value:
                  model: MiniMax-H3
                  content:
                    - type: text
                      text: >-
                        Character speaks: Follow the wind, live free. Leave
                        worries behind, enjoy the moment. Voice timbre follows
                        reference audio 1.
                    - type: video_url
                      video_url:
                        url: >-
                          https://cdn.hailuoai.com/prod/hailuo_demo/testsets/h3_promo_eval_ref2va/gallery/sr_v2p26_trio_seed42_20260724/inputs/297573323635_00_%E8%A7%86%E9%A2%911_YnyRbxEwio_video_20260525_163755_1927e9d3.mp4
                      role: reference_video
                    - type: audio_url
                      audio_url:
                        url: >-
                          https://cdn.hailuoai.com/prod/hailuo_demo/testsets/h3_promo_eval_ref2va/gallery/sr_v2p26_trio_seed42_20260724/inputs/f463d523c5ce_01_%E9%9F%B3%E9%A2%911_RSLcbpzJPo_6%E6%9C%885%E6%97%A5(1).mp3
                      role: reference_audio
                    - type: video_url
                      video_url:
                        url: https://your-cdn.example.com/h3-r2va-768p.mp4
                      role: base_video
                  resolution: 2K
        required: true
      responses:
        '200':
          description: >-
            The create endpoint returns a `task_id`. Use this `task_id` with the
            [Query Task](/api-reference/video-generation-v2-query) endpoint to
            retrieve the task status and result.


            **Successful Query Task response example**


            ```json

            {
              "task": {
                "id": "424010985738631",
                "model": "MiniMax-H3",
                "status": "succeeded",
                "created_at": 1785126000,
                "updated_at": 1785126300,
                "content": {
                  "url": "https://your-cdn.example.com/h3-regenerated-2k-output.mp4"
                },
                "resolution": "2K",
                "duration": 5,
                "usage": {
                  "total_seconds": 5,
                  "input_seconds": 0,
                  "output_seconds": 5,
                  "input_image_count": 0
                },
                "ratio": "",
                "task_type": "regeneration",
                "modality": "video"
              }
            }

            ```
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/VideoGenerationV2Resp'
        '400':
          $ref: '#/components/responses/Err400'
        '401':
          $ref: '#/components/responses/Err401'
        '402':
          $ref: '#/components/responses/Err402'
        '422':
          $ref: '#/components/responses/Err422'
        '429':
          $ref: '#/components/responses/Err429'
        '500':
          $ref: '#/components/responses/Err500'
components:
  schemas:
    VideoRegenerationSourceTaskReq:
      type: object
      title: Regenerate by task ID (source_task_id)
      required:
        - model
        - source_task_id
        - resolution
      properties:
        model:
          type: string
          description: Model name. Required. Currently supports `MiniMax-H3`.
          enum:
            - MiniMax-H3
        source_task_id:
          type: string
          description: >-
            The `task_id` of an existing **succeeded** `/v2/video_generation`
            task; its output is used as the source for regeneration.
            Constraints: requires whitelist access; the source task must be
            owned by the current account, in `succeeded` status, and still
            queryable via `/v2/query/video_generation` (created within 7 days).
        resolution:
          type: string
          description: >-
            Target resolution for video regeneration. Required. Currently
            supports `2K`.
          enum:
            - 2K
        callback_url:
          type: string
          description: >-
            Callback URL for task status changes. Optional. Same behavior as
            `callback_url` of the create video generation task endpoint.
        aigc_watermark:
          type: boolean
          description: >-
            Whether to add an AIGC label watermark to the generated video.
            Optional. Defaults to `false`.
          default: false
    VideoRegenerationBaseVideoReq:
      type: object
      title: Regenerate by source video (base_video)
      required:
        - model
        - content
        - resolution
      properties:
        model:
          type: string
          description: Model name. Required. Currently supports `MiniMax-H3`.
          enum:
            - MiniMax-H3
        content:
          type: array
          description: >-
            Video regeneration input array. Include:


            - **Submit exactly the same inputs that were actually sent to the
            model when generating the 768P source video**. **The `text` must be
            the final prompt actually sent to the model, not the original prompt
            from before H3-Context-IR processing**. All reference images,
            videos, and audio must also match the original generation inputs.
            **Any mismatch may prevent regeneration from producing the expected
            result**

            - One 768P source-video item with `type=video_url` and
            `role=base_video`; exactly one such item is required


            `base_video` must meet the following MiniMax-H3 768P output
            specifications. This endpoint does not regenerate arbitrary videos.


            | Item | Specification |

            | :--- | :--- |

            | Audio track | Must be present; videos without an audio track are
            not supported |

            | Frame rate | 24 fps |

            | Width / Height | Both must be divisible by 32 |

            | Area (W × H) | 768 × 768 (589,824 px) ≤ area ≤ 768 × 1344
            (1,032,192 px) |

            | Total frames | 107–362 frames in increments of 17 (about 4–15
            seconds) |


            ---


            **Input media limits**: the total request body must be ≤ 64 MB; use
            public URLs for large files and avoid Base64. Format and per-file
            size limits for reference images / videos / audio are the same as
            the [Create Video Generation
            Task](/api-reference/video-generation-v2-create) endpoint.
          items:
            $ref: '#/components/schemas/RegenContentItem'
          contains:
            type: object
            required:
              - type
              - video_url
              - role
            properties:
              type:
                const: video_url
              role:
                const: base_video
          minContains: 1
          maxContains: 1
        resolution:
          type: string
          description: >-
            Target resolution for video regeneration. Required. Currently
            supports `2K`.
          enum:
            - 2K
        callback_url:
          type: string
          description: >-
            Callback URL for task status changes. Optional. Same behavior as
            `callback_url` of the create video generation task endpoint.
        aigc_watermark:
          type: boolean
          description: >-
            Whether to add an AIGC label watermark to the generated video.
            Optional. Defaults to `false`.
          default: false
    VideoGenerationV2Resp:
      type: object
      properties:
        task_id:
          type: string
          description: ID of the task, used to query the task status and result later.
      example:
        task_id: '424010985738629'
    RegenContentItem:
      type: object
      required:
        - type
      properties:
        type:
          type: string
          description: Type of the input content.
          enum:
            - text
            - image_url
            - video_url
            - audio_url
        text:
          type: string
          description: >-
            **Must be the final prompt actually sent to the model when
            generating the 768P source video, not the original prompt from
            before H3-Context-IR processing**. Length is counted by characters,
            with a maximum of 40000 characters per `text`.
        image_url:
          type: object
          description: >-
            Image object when `type=image_url` (for format / size / dimension /
            count limits, see the content field of the [Create Video Generation
            Task](/api-reference/video-generation-v2-create#body-content)
            endpoint).
          required:
            - url
          properties:
            url:
              type: string
              description: >-
                Image location. Supported: a public URL; `mm_file://{file_id}`
                (reference an existing platform file, e.g. an uploaded file or a
                previous output's file_id); a
                `data:image/<format>;base64,<Base64>` data URI (`<format>`
                lowercase).
        video_url:
          type: object
          description: >-
            Video object when `type=video_url` (reference video, reference
            scenario only; for format / size / duration limits, see the content
            field of the [Create Video Generation
            Task](/api-reference/video-generation-v2-create#body-content)
            endpoint).
          required:
            - url
          properties:
            url:
              type: string
              description: >-
                Video location. Supported: a public URL; `mm_file://{file_id}`
                (reference an existing platform file's file_id); a
                `data:video/mp4;base64,<Base64>` data URI. Note the total
                request body must be ≤ 64 MB and Base64 inflates size by about
                33%, so use a public URL or mm_file:// for large videos.
        audio_url:
          type: object
          description: >-
            Audio object when `type=audio_url` (reference audio, reference
            scenario only; for format / size / duration limits, see the content
            field of the [Create Video Generation
            Task](/api-reference/video-generation-v2-create#body-content)
            endpoint).
          required:
            - url
          properties:
            url:
              type: string
              description: >-
                Audio location. Supported: a public URL; `mm_file://{file_id}`
                (reference an existing platform file's file_id); a
                `data:audio/<format>;base64,<Base64>` data URI (`<format>`
                lowercase).
        role:
          type: string
          description: >-
            Position or purpose of the content, conditionally required:

            - **`base_video`: source video for video regeneration**
            (`/v2/video_regeneration` only). **The source-video item must
            explicitly set this `role`, and `content` must contain exactly one
            such item.**

            - `first_frame`: first-frame image (image-to-video; when there is a
            single image and no role is set, it defaults to first_frame).

            - `last_frame`: last-frame image (image-to-video first & last frame,
            must be paired with first_frame).

            - `reference_image`: reference image (reference-to-video).

            - `reference_video`: reference video (reference-to-video).

            - `reference_audio`: reference audio (reference-to-video).
          enum:
            - base_video
            - first_frame
            - last_frame
            - reference_image
            - reference_video
            - reference_audio
      description: >-
        Video regeneration input item: either an item from the original
        generation content (text / image_url / video_url / audio_url) or the
        base_video that marks the source video. The base_video item must contain
        `type`, `video_url`, and `role=base_video`.
    OaiError:
      type: object
      description: >-
        OpenAI-style error response. On error the HTTP status is the real error
        code (401/400/429/402/422/500…) and the body is this object.
      properties:
        type:
          type: string
          description: Always `error`.
          example: error
        error:
          $ref: '#/components/schemas/OaiErrorDetail'
        request_id:
          type: string
          description: Request trace ID (for troubleshooting).
    OaiErrorDetail:
      type: object
      properties:
        type:
          type: string
          description: >-
            Error type:
            `authorized_error`(401)/`bad_request_error`(400)/`rate_limit_error`(429)/`insufficient_balance_error`(402)/`unprocessable_entity_error`(422)/`overloaded_error`(529)/`server_error`(500),
            etc.
        message:
          type: string
          description: >-
            Error detail; the trailing parenthesis holds the internal error code
            (e.g. `... (1004)`).
        http_code:
          type: string
          description: HTTP status code as a string, e.g. `401`.
  responses:
    Err400:
      description: Invalid parameters
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/OaiError'
          example:
            type: error
            error:
              type: bad_request_error
              message: >-
                invalid params, content must include a non-empty text item
                (prompt is required) (2013)
              http_code: '400'
            request_id: 021785229015510a2c883cf675b9804d
    Err401:
      description: Authentication failed
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/OaiError'
          example:
            type: error
            error:
              type: authorized_error
              message: >-
                login fail: Please carry the API secret key in the
                'Authorization' field of the request header (1004)
              http_code: '401'
            request_id: 021785229015510a2c883cf675b9804d
    Err402:
      description: Insufficient balance/quota
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/OaiError'
          example:
            type: error
            error:
              type: insufficient_balance_error
              message: insufficient balance (1008)
              http_code: '402'
            request_id: 021785229015510a2c883cf675b9804d
    Err422:
      description: Input contains sensitive content
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/OaiError'
          example:
            type: error
            error:
              type: unprocessable_entity_error
              message: video description contains sensitive content (1026)
              http_code: '422'
            request_id: 021785229015510a2c883cf675b9804d
    Err429:
      description: Rate limit triggered
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/OaiError'
          example:
            type: error
            error:
              type: rate_limit_error
              message: rate limit, please retry later (1002)
              http_code: '429'
            request_id: 021785229015510a2c883cf675b9804d
    Err500:
      description: Server error
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/OaiError'
          example:
            type: error
            error:
              type: server_error
              message: internal error (1000)
              http_code: '500'
            request_id: 021785229015510a2c883cf675b9804d
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
      description: >-
        `HTTP: Bearer Auth`

        - Security Scheme Type: http

        - HTTP Authorization Scheme: `Bearer API_key`, used to verify account
        information, can be found in [Account Management>API
        Keys](https://platform.minimax.io/user-center/basic-information/interface-key).

````