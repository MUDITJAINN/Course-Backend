import { CourseChunk } from "../../../models/courseChunk.model.js";
import { chunkFilter } from "../../utils/tutorResource.js";
import {
  ensureQdrantCollection,
  deleteQdrantByResource,
  upsertQdrantPoints,
  searchQdrant,
} from "./qdrant.store.js";
import {
  deleteWeaviateByResource,
  upsertWeaviateObjects,
  searchWeaviate,
} from "./weaviate.store.js";
import { createHash } from "crypto";
import { deleteMongoChunks, searchMongoChunks } from "./mongodb.store.js";

let cachedVectorSize = null;

function mongoIdToUuid(id) {
  const hash = createHash("sha256").update(String(id)).digest("hex").slice(0, 32);
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
}

function parsePageFromText(text) {
  const m = String(text).match(/\[Page\s+(\d+)\]/i);
  return m ? Number(m[1]) : null;
}

export function createVectorStore(config) {
  const store = config.vectorStore;

  return {
    provider: store,

    async deleteResource(resourceType, resourceId) {
      if (store === "qdrant") {
        await deleteQdrantByResource({
          url: config.qdrantUrl,
          apiKey: config.qdrantApiKey,
          collection: config.qdrantCollection,
          resourceType,
          resourceId,
        });
      }
      if (store === "weaviate") {
        await deleteWeaviateByResource(config, resourceType, resourceId);
      }
      await deleteMongoChunks(resourceType, resourceId);
    },

    async saveChunk({
      resourceType,
      resourceId,
      courseId,
      noteId,
      lectureId,
      lectureTitle,
      chunkIndex,
      text,
      embedding,
      pdfFilename = "",
    }) {
      const page = parsePageFromText(text);

      const chunkDoc = await CourseChunk.create({
        ...(courseId ? { courseId } : {}),
        ...(noteId ? { noteId } : {}),
        lectureId,
        lectureTitle,
        chunkIndex,
        text,
        embedding: store === "mongodb" ? embedding : undefined,
      });

      const properties = {
        text,
        pdf: pdfFilename,
        page: page ?? chunkIndex + 1,
        resourceType,
        resourceId: String(resourceId),
        lectureTitle,
        chunkIndex,
        chunkId: String(chunkDoc._id),
      };

      if (store === "qdrant") {
        if (!cachedVectorSize) cachedVectorSize = embedding.length;
        await ensureQdrantCollection({
          url: config.qdrantUrl,
          apiKey: config.qdrantApiKey,
          collection: config.qdrantCollection,
          vectorSize: embedding.length,
        });
        await upsertQdrantPoints({
          url: config.qdrantUrl,
          apiKey: config.qdrantApiKey,
          collection: config.qdrantCollection,
          points: [
            {
              id: mongoIdToUuid(chunkDoc._id),
              vector: embedding,
              payload: properties,
            },
          ],
        });
      }

      if (store === "weaviate") {
        await upsertWeaviateObjects(config, [
          {
            id: mongoIdToUuid(chunkDoc._id),
            vector: embedding,
            properties,
          },
        ]);
      }

      return chunkDoc;
    },

    async search(resourceType, resourceId, queryVector, topK) {
      if (store === "weaviate") {
        const hits = await searchWeaviate({
          config,
          vector: queryVector,
          resourceType,
          resourceId,
          topK,
        });
        const chunkCount = await CourseChunk.countDocuments(
          chunkFilter(resourceType, resourceId)
        );
        return { hits, chunkCount };
      }

      if (store === "qdrant") {
        const hits = await searchQdrant({
          url: config.qdrantUrl,
          apiKey: config.qdrantApiKey,
          collection: config.qdrantCollection,
          vector: queryVector,
          resourceType,
          resourceId,
          topK,
        });
        const chunkCount = await CourseChunk.countDocuments(
          chunkFilter(resourceType, resourceId)
        );
        return { hits, chunkCount };
      }

      return searchMongoChunks({ resourceType, resourceId, queryVector, topK });
    },
  };
}
