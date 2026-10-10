# Documentação — Clip Miner

Documentação dos processos mais relevantes da CLI.

## Índice

- [Arquitetura](./arquitetura.md) — visão geral do pipeline e fluxo de dados
- [Pipeline](./pipeline.md) — as 5 etapas, entradas, saídas e retomada
- [Mineração de candidatos](./mineracao.md) — single-call vs. chunking, validação e snap
- [Ranking e deduplicação](./ranking-e-deduplicacao.md) — como o TOP N é escolhido
- [Chamadas ao Gemini](./gemini.md) — structured output, retry e uso de tokens
- [Configuração](./configuracao.md) — variáveis de ambiente e perfis

## Visão rápida

```
video.mp4 + video.srt
        │
        ▼
  parse SRT ──► mineração (Gemini) ──► deduplicação ──► ranking (Gemini) ──► cortes (FFmpeg)
        │              │                     │                 │                   │
  transcript.json  candidates.json      (em memória)    final-ranking.json     output/clips/*.mp4
```

A IA é usada **apenas para análise**. Vídeo, transcrição, deduplicação e cortes rodam localmente.
