# Ranking e deduplicação

Duas etapas locais + IA que transformam muitos candidatos crus no TOP N final.

## Deduplicação

`src/candidates/deduplicate.ts`. Remove candidatos que se sobrepõem demais, mantendo o de maior `score`. A sobreposição é medida por **IoU** (Intersection over Union):

```
IoU = interseção / união

candidato A: 0 → 50
candidato B: 2 → 52
interseção = 48, união = 54  → IoU ≈ 0.89  → duplicado (removido)

candidato A: 0  → 50
candidato B: 49 → 100
interseção = 1,  união = 101 → IoU ≈ 0.01  → distintos (mantidos)
```

O limiar padrão é `0.5`. Usar IoU (em vez de "qualquer sobreposição") evita descartar cortes adjacentes legítimos que compartilham apenas alguns segundos.

> No caminho single-call não há overlap, então a deduplicação normalmente não remove nada — ela é essencial no fallback com chunking.

## Ranking final

`src/ai/candidate-ranker.ts`. Em vez de pedir à IA para "achar os melhores momentos de 2 horas", entregamos a lista já minerada e pedimos para **escolher os melhores** — um problema muito menor e com contexto reduzido.

```
~60 candidatos únicos
       │
       ▼
buildRankingPrompt (critérios de hook, retenção, clareza...)
       │
       ▼
generateStructured (GEMINI_MODEL, temperatura 0.3)
       │
       ▼
TOP_CLIPS selecionados
```

### Proteção contra alteração de timestamps

O modelo poderia devolver `start`/`end` levemente diferentes. Para garantir que o corte use os limites já ajustados, cada selecionado é **reconciliado com o candidato de entrada de maior sobreposição** (`matchToInput`), e duplicatas por fronteira são removidas (`dedupeByBounds`).

### Atalho

Se o número de candidatos já é `<= TOP_CLIPS`, o ranking por IA é pulado (não há o que filtrar) e nenhum token é gasto nessa etapa.
