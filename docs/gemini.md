# Chamadas ao Gemini

Centralizadas em `src/ai/gemini.ts` (client) e `src/ai/retry.ts` (resiliência).

## Structured output

Todas as chamadas pedem JSON com schema, evitando parsing frágil de texto:

```ts
generateStructured(model, prompt, responseJsonSchema, temperature)
```

- `responseMimeType: "application/json"` força saída JSON.
- `responseJsonSchema` é **derivado do schema Zod** por `toGeminiResponseSchema()` (`src/candidates/types.ts`). Uma fonte só evita divergência entre o que a IA retorna e o que o Zod valida.
- `category` é um enum no schema, então a IA não inventa categorias fora da lista.

Isso elimina gambiarras como remover ```` ```json ```` da resposta.

## Uso de tokens

`generateStructured` lê `response.usageMetadata` e retorna um objeto `Usage`:

```ts
{ promptTokens, outputTokens, totalTokens }
```

O pipeline acumula (`addUsage`) o uso de todas as chamadas e grava em `report.json`, dando visibilidade de consumo por execução.

## Retry seletivo

`withRetry` (`src/ai/retry.ts`) **só repete** em erros que valem a pena:

- `429` (cota), `500`, `503` (indisponibilidade temporária);
- erros de rede (`ECONNRESET`, `ETIMEDOUT`, `fetch failed`, etc.).

Erros como `400` (requisição inválida) **não** são repetidos — repetir só desperdiçaria tentativas. Quando o erro traz `Retry-After`, esse valor é respeitado; caso contrário, usa backoff exponencial (`2s, 4s, 8s, ...`).

```
tentativa falha
   │
   ▼
é 429/5xx ou rede?  ──não──► lança o erro
   │ sim
   ▼
espera (Retry-After ou backoff) e tenta de novo (até 5x)
```

## Controle de ritmo no chunking

No fallback com múltiplos blocos, as chamadas são feitas **em sequência** com uma pausa entre elas (`sleep`), em vez de disparar tudo em paralelo — o que facilmente estouraria os limites de RPM/TPM do nível gratuito.
