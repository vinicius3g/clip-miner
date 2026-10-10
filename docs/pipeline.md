# Pipeline

Orquestrado por `processVideo` em `src/pipeline/process-video.ts`. São 5 etapas, cada uma com retomada automática.

## Entrada

```powershell
npm run dev -- videos/podcast.mp4 [videos/podcast.srt]
```

Se o SRT não for informado, é inferido trocando a extensão do vídeo por `.srt`. Antes de iniciar, o `preflight` valida: `.env`, existência do vídeo e do SRT, e `ffmpeg` no PATH.

## Etapas

| # | Etapa | Função | Saída persistida |
| --- | --- | --- | --- |
| 1 | Transcrição | `parseSrt` | `data/<video>/transcript.json` |
| 2 | Mineração | `mineCandidates` | `data/<video>/candidates.json` |
| 3 | Deduplicação | `deduplicate` | (em memória) |
| 4 | Ranking | `rankCandidates` | `data/<video>/final-ranking.json` |
| 5 | Cortes | `cutVideo` | `output/<video>/clips/*.mp4` |

Ao final, grava `output/<video>/report.json` com total de candidatos, selecionados, se usou chunking e os **tokens consumidos**.

## Retomada (resume)

Cada etapa custosa verifica se o arquivo de saída já existe antes de executar:

```
data/<video>/
├── transcript.json      ← existe? pula o parse
├── candidates.json      ← existe? pula a mineração (não gasta cota)
└── final-ranking.json   ← existe? pula o ranking
```

Isso significa que, se uma execução falhar na etapa 4, a próxima reusa `transcript.json` e `candidates.json` e continua do ranking. Para **forçar o reprocessamento** de uma etapa, apague o JSON correspondente.

> Observação: a retomada da mineração é por arquivo único (`candidates.json`). Se desejar granularidade por bloco no caminho com chunking, essa é uma evolução natural (um arquivo por bloco).

## Estrutura de saída

```
output/<video>/
├── clips/
│   ├── 01-disciplina.mp4
│   ├── 02-motivacao.mp4
│   └── ...
└── report.json
```

O nome de cada clipe é `NN-<categoria>` (rank + categoria do candidato, via `slugify`).

## report.json (exemplo)

```json
{
  "video": "podcast.mp4",
  "duration": 8123,
  "totalCandidates": 87,
  "uniqueCandidates": 64,
  "selected": 10,
  "usedChunking": false,
  "tokensUsed": { "promptTokens": 41230, "outputTokens": 2890, "totalTokens": 44120 },
  "clips": [
    {
      "rank": 1,
      "start": 2531,
      "end": 2580,
      "duration": 49,
      "title": "Você não precisa estar motivado",
      "hook": "Você não precisa estar motivado para começar",
      "category": "disciplina",
      "score": 94,
      "file": "output/podcast/clips/01-disciplina.mp4"
    }
  ]
}
```
