import type { Transcript, TranscriptSegment } from "./types.js";

function parseTimestamp(value: string): number {
  const [time, milliseconds] = value.split(",");

  const [hours, minutes, seconds] = time.split(":").map(Number);

  return hours * 3600 + minutes * 60 + seconds + Number(milliseconds) / 1000;
}

export function parseSrt(content: string): Transcript {
  const blocks = content.replace(/\r/g, "").split("\n\n");

  const segments: TranscriptSegment[] = [];

  for (const block of blocks) {
    const lines = block.split("\n").filter((line) => line.length > 0);

    if (lines.length < 2) continue;

    const timeLine = lines.find((line) => line.includes("-->"));

    if (!timeLine) continue;

    const [startRaw, endRaw] = timeLine.split("-->").map((value) => value.trim());

    const start = parseTimestamp(startRaw);
    const end = parseTimestamp(endRaw);

    const textLines = lines.slice(lines.indexOf(timeLine) + 1);

    const text = textLines
      .join(" ")
      .replace(/<[^>]+>/g, "")
      .trim();

    if (!text) continue;

    segments.push({
      id: segments.length,
      start,
      end,
      text,
    });
  }

  return {
    duration: segments.at(-1)?.end ?? 0,
    segments,
  };
}
