/**
 * Seed AI tutor sections for the first published note + RAG index.
 *
 * Usage: npm run seed:tutor:notes
 */

import dotenv from "dotenv";
import mongoose from "mongoose";
import { Note } from "../models/note.model.js";
import { CourseLecture } from "../models/courseLecture.model.js";
import { loadTutorConfig } from "../ai-tutor/config.js";
import { indexTutorResource } from "../ai-tutor/services/indexing.service.js";
import { TUTOR_RESOURCE } from "../ai-tutor/utils/tutorResource.js";

dotenv.config();

const DEMO_SECTIONS = [
  {
    order: 1,
    title: "Section 1 — Arrays & complexity",
    content: `Arrays store elements in contiguous memory. Access by index is O(1); insert/delete in the middle is O(n).
Two-pointer technique helps solve pair-sum and palindrome problems in O(n).
Always state time and space complexity in interviews.`,
  },
  {
    order: 2,
    title: "Section 2 — Linked lists",
    content: `Singly linked list: each node has value and next pointer. Head is the entry point.
Reverse a list iteratively with three pointers: prev, curr, next.
Cycle detection: Floyd's tortoise and hare — if they meet, a cycle exists.`,
  },
  {
    order: 3,
    title: "Section 3 — Stacks & queues",
    content: `Stack: LIFO — push/pop at top. Use for parentheses matching, monotonic stack, DFS.
Queue: FIFO — enqueue rear, dequeue front. BFS level-order traversal uses a queue.
Deque allows push/pop at both ends in O(1).`,
  },
];

async function main() {
  const config = loadTutorConfig({ TUTOR_ENABLED: "true" });

  await mongoose.connect(process.env.MONGO_URI);
  const noteTitleArg = process.argv[2];
  let note;
  if (noteTitleArg) {
    const re = new RegExp(noteTitleArg, "i");
    note = await Note.findOne({ isPublished: true, title: re });
    if (!note) {
      console.error(`No published note matching title: ${noteTitleArg}`);
      process.exit(1);
    }
  } else {
    note = await Note.findOne({ isPublished: true }).sort({ createdAt: -1 });
  }
  if (!note) {
    console.error("No published notes in database. Create a note in admin first.");
    process.exit(1);
  }

  console.log(`Seeding tutor for note: ${note.title} (${note._id})`);
  console.log("Tip: pass a title substring: node scripts/seed-tutor-notes.js TypeScript");

  const existing = await CourseLecture.countDocuments({ noteId: note._id });
  if (existing === 0) {
    for (const section of DEMO_SECTIONS) {
      await CourseLecture.create({ noteId: note._id, ...section });
    }
    console.log(`Created ${DEMO_SECTIONS.length} demo sections.`);
  } else {
    console.log(`Skipping section insert (${existing} sections already exist).`);
  }

  console.log("Indexing (also tries PDF on disk if no sections)...");
  const result = await indexTutorResource(TUTOR_RESOURCE.NOTE, note._id, config);
  console.log("Done:", result);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
