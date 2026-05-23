import { CourseChunk } from "../../../models/courseChunk.model.js";
import { cosineSimilarity } from "../../utils/cosineSimilarity.js";
import { chunkFilter } from "../../utils/tutorResource.js";

export async function deleteMongoChunks(resourceType, resourceId) {
  await CourseChunk.deleteMany(chunkFilter(resourceType, resourceId));
}

export async function searchMongoChunks({
  resourceType,
  resourceId,
  queryVector,
  topK,
}) {
  const chunks = await CourseChunk.find(chunkFilter(resourceType, resourceId)).lean();
  if (!chunks.length) return { hits: [], chunkCount: 0 };

  const hits = chunks
    .map((chunk) => ({
      score: cosineSimilarity(queryVector, chunk.embedding),
      text: chunk.text,
      lectureTitle: chunk.lectureTitle,
      chunkIndex: chunk.chunkIndex,
      chunkId: String(chunk._id),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  return { hits, chunkCount: chunks.length };
}
