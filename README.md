# Clip Miner

CLI local que minera cortes com potencial de Short a partir de um vídeo longo + sua transcrição `.srt`, usando Gemini apenas para a análise. Processamento de vídeo e cortes rodam na sua máquina.

## Requisitos

- Node.js
- FFmpeg no PATH
- Chave da Gemini API (nível gratuito)

## Setup

```powershell
npm install
Copy-Item .env.example .env   # preencha GEMINI_API_KEY
```

## Uso

```powershell
# a transcrição é inferida como <video>.srt se não for passada
npm run dev -- videos/podcast.mp4
# ou explicitamente
npm run dev -- videos/podcast.mp4 videos/podcast.srt
```

Saídas:

- `data/<video>/` — `transcript.json`, `candidates.json`, `final-ranking.json` (usados para **retomar** execuções)
- `output/<video>/clips/*.mp4` — os cortes
- `output/<video>/report.json` — resumo + tokens usados

## Como funciona

1. Parse do SRT em segmentos com timestamps.
2. Mineração de candidatos no Gemini em **uma única chamada** (cai para blocos com overlap só se a transcrição exceder `SINGLE_CALL_TOKEN_BUDGET`).
3. Deduplicação local por sobreposição (IoU).
4. Ranking final no Gemini → TOP `TOP_CLIPS`.
5. Cortes com FFmpeg.

Timestamps são ajustados aos limites dos segmentos (sem cortes no meio da frase) e a saída da IA é validada com Zod.

## Scripts

```powershell
npm run typecheck   # tsc --noEmit
npm test            # vitest
npm run build       # compila para dist/
```

## Config (`.env`)

Veja `.env.example`. Principais: `GEMINI_MODEL`, `GEMINI_FAST_MODEL`, `TOP_CLIPS`, `MIN/MAX_CLIP_SECONDS`, `SINGLE_CALL_TOKEN_BUDGET`, `CLIP_PROFILE` (opcional).
