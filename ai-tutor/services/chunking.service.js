/**
 * Split lecture text into overlapping chunks for embedding + retrieval.
 */
export function chunkText(text, { chunkSize = 900, chunkOverlap = 120 } = {}) {
  const normalized = String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (!normalized) return [];

  const paragraphs = normalized.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
  const chunks = [];
  let buffer = "";

  const flush = () => {
    const piece = buffer.trim();
    if (piece) chunks.push(piece);
    buffer = "";
  };

  for (const para of paragraphs) {
    if ((buffer + "\n\n" + para).length <= chunkSize) {
      buffer = buffer ? `${buffer}\n\n${para}` : para;
      continue;
    }

    if (buffer) flush();

    if (para.length <= chunkSize) {
      buffer = para;
      continue;
    }

    let start = 0;
    while (start < para.length) {
      const end = Math.min(start + chunkSize, para.length);
      chunks.push(para.slice(start, end).trim());
      if (end >= para.length) break;
      start = Math.max(end - chunkOverlap, start + 1);
    }
  }

  flush();
  return chunks;
}
