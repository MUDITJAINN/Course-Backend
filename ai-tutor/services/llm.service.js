import { TUTOR_RESOURCE } from "../utils/tutorResource.js";

export function buildTutorSystemPrompt({
  resourceType,
  title,
  ragContext,
  sources,
  hasIndexedChunks = true,
}) {
  const sourceList = sources?.length
    ? sources.map((s) => `- ${s.lectureTitle} (chunk ${s.chunkIndex + 1})`).join("\n")
    : "(no chunks retrieved for this question)";

  const isNote = resourceType === TUTOR_RESOURCE.NOTE;
  const label = isNote ? "study notes" : "course";
  const sectionWord = isNote ? "sections/pages" : "lectures";
  const emptyMaterial =
    !ragContext?.trim() ||
    ragContext.includes("(No indexed content") ||
    !hasIndexedChunks;

  const strictRules = emptyMaterial
    ? [
        "STATUS: NO NOTE MATERIAL WAS RETRIEVED FOR THIS QUESTION.",
        `You MUST reply exactly in spirit: "I don't have indexed content from "${title}" for that topic yet. Please ask the admin to run Reindex RAG in Admin → AI Tutor (Notes) after the PDF is on the server."`,
        "Do NOT answer from general knowledge, training data, or the web.",
        "Do NOT explain TypeScript, enums, or any topic unless the text appears below.",
      ]
    : [
        "STATUS: Retrieved excerpts from the purchased material are below.",
        `Answer ONLY from the material between the === markers. Cite page numbers when you see [Page N] in the text.`,
        `If the exact topic (e.g. enum) is not in the excerpts, say: "That topic is not in the indexed pages I retrieved — try rephrasing or ask admin to reindex the PDF."`,
        "NEVER supplement with general knowledge, training data, or guesses.",
      ];

  return [
    `You are an AI tutor for the ${label} "${title}".`,
    ...strictRules,
    "Use clear markdown when you have material to cite.",
    "",
    "Retrieved chunks:",
    sourceList,
    "",
    `=== ${isNote ? "NOTE" : "COURSE"} MATERIAL (RAG — ONLY SOURCE OF TRUTH) ===`,
    emptyMaterial
      ? "(EMPTY — do not invent content. Tell the user to reindex this note's PDF.)"
      : ragContext,
    `=== END MATERIAL ===`,
  ].join("\n");
}
