export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function fitsSingleCall(text: string, budget: number): boolean {
  return estimateTokens(text) <= budget;
}
