/**
 * Builds the "knowledge" string injected into the LLM system prompt.
 *
 * Pattern for reuse in other projects:
 * 1. Static pages/FAQs (always available)
 * 2. Dynamic DB records (courses, products, docs, etc.)
 * 3. Optional custom provider function you pass from the host app
 */

function truncate(text, maxChars) {
  if (!text || text.length <= maxChars) return text || "";
  return `${text.slice(0, maxChars)}\n...[truncated]`;
}

function formatCourseList(courses = []) {
  if (!courses.length) return "No courses are published yet.";
  return courses
    .map(
      (c, i) =>
        `${i + 1}. ${c.title} — ₹${c.price}\n   ${truncate(c.description, 280)}`
    )
    .join("\n");
}

function formatNoteList(notes = []) {
  if (!notes.length) return "No notes are published yet.";
  return notes
    .map(
      (n, i) =>
        `${i + 1}. ${n.title} — ₹${n.price} (${n.pages} pages)\n   ${truncate(n.description, 280)}`
    )
    .join("\n");
}

/**
 * @param {object} options
 * @param {Function} [options.fetchCourses] async () => [{ title, description, price }]
 * @param {Function} [options.fetchNotes] async () => [{ title, description, price, pages }]
 * @param {Function|Promise<string>} [options.staticKnowledge] site-specific text block
 * @param {number} [options.maxContextChars]
 */
export async function buildKnowledgeContext({
  fetchCourses,
  fetchNotes,
  staticKnowledge = "",
  maxContextChars = 12000,
}) {
  const [courses, notes] = await Promise.all([
    fetchCourses ? fetchCourses() : [],
    fetchNotes ? fetchNotes() : [],
  ]);

  const staticBlock =
    typeof staticKnowledge === "function"
      ? await staticKnowledge()
      : staticKnowledge;

  const sections = [
    staticBlock,
    "",
    "## Live catalog: Courses",
    formatCourseList(courses),
    "",
    "## Live catalog: Notes",
    formatNoteList(notes),
  ];

  return truncate(sections.filter(Boolean).join("\n"), maxContextChars);
}
