# RunPod Serverless: OctOpus3_30B_A3B

CorteX uses the public model name `OctOpus3_30B_A3B`. RunPod loads
the source weights from `Qwen/Qwen3-30B-A3B` and exposes the OctOpus alias
through its OpenAI-compatible API.

## Create the endpoint

In RunPod, open **Serverless**, select the latest **vLLM** ready-to-deploy
worker, and create an endpoint with these settings:

| Setting | Value |
| --- | --- |
| Endpoint name | `OctOpus3_30B_A3B` |
| Model | `Qwen/Qwen3-30B-A3B` |
| GPU | A100 80 GB or H100 80 GB |
| Max model length | `8192` |
| Minimum workers | `0` for testing, `1` for production |
| Maximum workers | `2` initially |

Add these public environment variables:

```text
MODEL_NAME=Qwen/Qwen3-30B-A3B
OPENAI_SERVED_MODEL_NAME_OVERRIDE=OctOpus3_30B_A3B
MAX_MODEL_LEN=8192
DTYPE=bfloat16
GPU_MEMORY_UTILIZATION=0.90
ENABLE_AUTO_TOOL_CHOICE=true
TOOL_CALL_PARSER=hermes
REASONING_PARSER=qwen3
RAW_OPENAI_OUTPUT=1
```

The model is public, so an `HF_TOKEN` is not required.

## Test RunPod directly

Create a scoped RunPod API key and keep it outside the repository. Replace the
placeholders below before running the request:

```bash
curl "https://api.runpod.ai/v2/RUNPOD_ENDPOINT_ID/openai/v1/chat/completions" \
  -H "Authorization: Bearer RUNPOD_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "OctOpus3_30B_A3B",
    "messages": [{"role": "user", "content": "Reply only with: connected"}],
    "temperature": 0.7,
    "max_tokens": 100
  }'
```

## Connect CorteX

The RunPod API key must stay behind the server-side proxy. Configure these
Azure Static Web Apps settings:

```text
AI_BASE_URL=https://api.runpod.ai/v2/RUNPOD_ENDPOINT_ID/openai/v1
AI_API_KEY=RUNPOD_API_KEY
```

Configure these frontend build variables:

```text
VITE_AI_PROXY_URL=/api/chat
VITE_AI_MODEL=OctOpus3_30B_A3B
```

Do not add `AI_API_KEY` to GitHub Pages, Vite variables, source files, or client
local storage. GitHub Pages cannot host the required server-side proxy; use the
included Azure Static Web Apps deployment for the shared production app.
