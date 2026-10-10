# Mineração de candidatos

Implementada em `src/ai/candidate-miner.ts`. Transforma a transcrição em uma lista de candidatos a Short, cada um com `start`, `end`, `title`, `hook`, `category`, `reason` e `score`.

## Decisão: single-call vs. chunking

O modelo Flash tem janela de entrada grande (ordem de 1M de tokens), então uma transcrição inteira geralmente cabe em **uma única chamada**. Isso é melhor porque:

- faz menos requisições → menor risco de estourar RPM/RPD e tomar `429`;
- dá à IA o **contexto global** do vídeo;
- dispensa overlap e deduplicação no caso comum.

A escolha é feita por orçamento estimado de tokens:

```
estimateTokens(texto) = ceil(texto.length / 4)

se estimateTokens(transcrição) <= SINGLE_CALL_TOKEN_BUDGET
    → 1 chamada com a transcrição inteira
senão
    → createChunks (blocos de CHUNK_MINUTES + CHUNK_OVERLAP_SECONDS)
      processados em sequência, com pausa entre chamadas
```

`SINGLE_CALL_TOKEN_BUDGET` (padrão `300000`) é um corte conservador bem abaixo do limite real, deixando margem para o prompt e a resposta.

## Chunking (fallback)

Quando a transcrição excede o orçamento, `createChunks` (`src/segmentation/segmenter.ts`) divide por **timestamp**, não por caractere:

```
Bloco 1  00:00 → 12:00
Bloco 2  11:30 → 23:30   (30s de overlap)
Bloco 3  23:00 → 35:00
```

O overlap evita que uma fala na borda de um bloco desapareça. Como o overlap pode gerar o mesmo corte em dois blocos, a deduplicação posterior remove repetições.

## Validação e ajuste da saída

Cada resposta da IA passa por duas garantias antes de virar candidato:

1. **Validação Zod** — `CandidateListSchema.safeParse`. Se a estrutura não bater, os candidatos daquela resposta são descartados (sem quebrar o pipeline).
2. **Snap de timestamps** — `snapToSegments` ajusta `start`/`end` para os limites de segmento mais próximos, garantindo que o corte não caia no meio de uma frase.

```
IA retorna start=2531.4, end=2577.9
        │
        ▼ snapToSegments
start=2531.2  end=2580.0   (limites reais de segmentos)
```

## Resumo do fluxo

```
Transcript
   │  renderSegments → "[start] texto" por linha
   ▼
buildCandidatePrompt (+ CLIP_PROFILE opcional)
   │
   ▼
generateStructured (withRetry)   → JSON
   │
   ▼
JSON.parse → CandidateListSchema.safeParse → snapToSegments
   │
   ▼
Candidate[]
```
