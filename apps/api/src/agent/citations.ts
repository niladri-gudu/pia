import type { RetrievedChunk } from "../retrieval/types";

/**
 * Map the chunks actually cited in an answer (`[Source N]` references) to
 * the persisted source list. When the answer cites nothing, the first few
 * chunks are surfaced instead so the user still sees where the context
 * came from.
 */
export function collectAnswerSources(
  answer: string,
  chunks: RetrievedChunk[],
  uncitedLimit = 5,
): Array<{
  title: string;
  url: string | null;
  similarity: number;
}> {
  const cited = new Set<number>();

  for (const match of answer.matchAll(/\[Source\s+(\d+)\]/gi)) {
    const sourceNumber = Number(match[1]);

    if (sourceNumber >= 1 && sourceNumber <= chunks.length) {
      cited.add(sourceNumber);
    }
  }

  const indices =
    cited.size > 0
      ? [...cited].sort((a, b) => a - b)
      : Array.from({ length: Math.min(uncitedLimit, chunks.length) }, (_, index) => index + 1);

  return indices.map((sourceNumber) => {
    const chunk = chunks[sourceNumber - 1];

    if (!chunk) {
      throw new Error(`Cited source ${sourceNumber} is out of range`);
    }

    return {
      title: chunk.title,
      url: chunk.url ?? null,
      similarity: chunk.similarity,
    };
  });
}
