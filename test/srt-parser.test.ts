import { describe, expect, it } from "vitest";
import { parseSrt } from "../src/transcription/srt-parser.js";

const SAMPLE = `1
00:00:01,000 --> 00:00:03,500
Primeira fala.

2
00:00:03,500 --> 00:00:06,000
<i>Segunda</i> fala.

3
00:00:06,000 --> 00:00:09,250
Terceira fala.
`;

describe("parseSrt", () => {
  it("extrai segmentos com timestamps em segundos", () => {
    const transcript = parseSrt(SAMPLE);

    expect(transcript.segments).toHaveLength(3);
    expect(transcript.segments[0]).toMatchObject({
      id: 0,
      start: 1,
      end: 3.5,
      text: "Primeira fala.",
    });
    expect(transcript.duration).toBe(9.25);
  });

  it("remove tags inline do texto", () => {
    const transcript = parseSrt(SAMPLE);
    expect(transcript.segments[1].text).toBe("Segunda fala.");
  });

  it("ignora blocos sem linha de tempo", () => {
    const transcript = parseSrt("lixo\nsem tempo\n\n");
    expect(transcript.segments).toHaveLength(0);
  });
});
