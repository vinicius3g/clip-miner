# Arquitetura

CLI local em Node.js/TypeScript. O único serviço externo é a API do Gemini, usada **somente para análise** dos trechos. Processamento de vídeo, parsing, deduplicação e cortes acontecem na máquina do usuário.

## Fluxo de dados

```
            video.mp4            video.srt
                │                    │
                │                    ▼
                │           parseSrt (srt-parser.ts)
                │                    │
                │                    ▼
                │            Transcript (segmentos
                │            com start/end em segundos)
                │                    │
                │                    ▼
                │        mineCandidates (candidate-miner.ts)
                │        ┌───────────────────────────┐
                │        │ cabe no budget de tokens?  │
                │        │  sim → 1 chamada Gemini    │
                │        │  não → blocos + overlap    │
                │        └───────────────────────────┘
                │                    │
                │                    ▼
                │            candidates.json
                │                    │
                │                    ▼
                │        deduplicate (IoU) — só relevante
                │        no caminho com chunking
                │                    │
                │                    ▼
                │        rankCandidates (candidate-ranker.ts)
                │            segunda chamada Gemini
                │                    │
                │                    ▼
                │            final-ranking.json (TOP N)
                │                    │
                └──────────┬─────────┘
                           ▼
                 cutVideo (cutter.ts, FFmpeg)
                           │
                           ▼
                 output/<video>/clips/*.mp4
                 output/<video>/report.json
```

## Camadas e responsabilidades

| Camada | Pasta | Responsabilidade |
| --- | --- | --- |
| Config | `src/config` | Carregar e validar o `.env` com Zod |
| Transcrição | `src/transcription` | Parse do SRT, render para prompt, snap de timestamps |
| Segmentação | `src/segmentation` | Blocos com overlap (fallback de contexto grande) |
| IA | `src/ai` | Client Gemini, retry, prompts, mineração, ranking |
| Candidatos | `src/candidates` | Schema Zod e deduplicação por IoU |
| Vídeo | `src/video` | Cortes com FFmpeg |
| Pipeline | `src/pipeline` | Orquestração, retomada e relatório |
| CLI | `src/cli` | Entrada do usuário e preflight |
| Utils | `src/utils` | Logger, arquivos, formatação, sleep, preflight |

## Princípios de projeto

- **Timestamps vêm da transcrição**, não da imaginação da IA. Toda saída é ajustada aos limites de segmento (`snapToSegments`).
- **Saída da IA é validada com Zod** antes de ser usada. Candidatos malformados são descartados.
- **Uma fonte de schema**: o `responseSchema` do Gemini é derivado do schema Zod (`toGeminiResponseSchema`).
- **Resiliência de cota**: retry seletivo (429/5xx) e retomada por arquivos evitam reprocessar e gastar cota à toa.
- **Custo zero** dentro das cotas gratuitas do Gemini; tudo o mais é local.
