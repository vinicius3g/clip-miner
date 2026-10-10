export interface Usage {
  promptTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export function emptyUsage(): Usage {
  return { promptTokens: 0, outputTokens: 0, totalTokens: 0 };
}

export function addUsage(a: Usage, b: Usage): Usage {
  return {
    promptTokens: a.promptTokens + b.promptTokens,
    outputTokens: a.outputTokens + b.outputTokens,
    totalTokens: a.totalTokens + b.totalTokens,
  };
}
