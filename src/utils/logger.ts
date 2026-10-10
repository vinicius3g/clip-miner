export const logger = {
  banner(title: string): void {
    console.log(`\n=== ${title} ===\n`);
  },
  step(tag: string, message: string): void {
    console.log(`\n[${tag}] ${message}`);
  },
  info(message: string): void {
    console.log(`  ${message}`);
  },
  error(message: string): void {
    console.error(`  ERRO: ${message}`);
  },
};
