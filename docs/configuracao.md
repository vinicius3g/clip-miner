# Configuração

Variáveis lidas e validadas por `src/config/env.ts` com Zod. Se algo obrigatório faltar ou tiver tipo inválido, a execução falha cedo com uma mensagem clara (em vez de quebrar no meio do pipeline).

## Variáveis

| Variável | Padrão | Descrição |
| --- | --- | --- |
| `GEMINI_API_KEY` | — (obrigatória) | Chave da Gemini API |
| `GEMINI_MODEL` | `gemini-2.5-flash` | Modelo do ranking final (mais capaz) |
| `GEMINI_FAST_MODEL` | `gemini-2.5-flash-lite` | Modelo da mineração (mais barato/rápido) |
| `CHUNK_MINUTES` | `12` | Tamanho do bloco no fallback com chunking |
| `CHUNK_OVERLAP_SECONDS` | `30` | Overlap entre blocos |
| `MIN_CLIP_SECONDS` | `25` | Duração mínima sugerida de um corte |
| `MAX_CLIP_SECONDS` | `90` | Duração máxima sugerida de um corte |
| `TOP_CLIPS` | `10` | Quantos cortes o ranking final seleciona |
| `SINGLE_CALL_TOKEN_BUDGET` | `300000` | Acima disso, a mineração cai para chunking |
| `CLIP_PROFILE` | (opcional) | Perfil do canal injetado nos prompts |

## Exemplo

```env
GEMINI_API_KEY=sua_chave_aqui

GEMINI_MODEL=gemini-2.5-flash
GEMINI_FAST_MODEL=gemini-2.5-flash-lite

CHUNK_MINUTES=12
CHUNK_OVERLAP_SECONDS=30

MIN_CLIP_SECONDS=25
MAX_CLIP_SECONDS=90

TOP_CLIPS=10
SINGLE_CALL_TOKEN_BUDGET=300000

CLIP_PROFILE=Conteúdo direto sobre disciplina e mentalidade, sem introduções longas.
```

## Perfil do canal (`CLIP_PROFILE`)

Quando definido, o texto é injetado tanto no prompt de mineração quanto no de ranking (`profileBlock` em `src/ai/prompts.ts`). Com isso, a IA procura e prioriza cortes **alinhados ao canal**, não apenas "momentos interessantes" genéricos.

## Observações sobre modelos e cotas

- Se sua conta não tiver acesso aos modelos `2.5`, basta trocar `GEMINI_MODEL`/`GEMINI_FAST_MODEL` por um Flash disponível no seu nível — a arquitetura não muda.
- "Gratuito" significa dentro das cotas do Gemini (RPM/TPM/RPD), que variam por projeto. O sistema trata `429` com retry e retoma de onde parou, então estourar a cota não perde progresso.
