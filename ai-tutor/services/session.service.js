import { TutorSession } from "../../models/tutorSession.model.js";
import { TutorMessage } from "../../models/tutorMessage.model.js";
import {
  sessionFilter,
  sessionCreatePayload,
  TUTOR_RESOURCE,
} from "../utils/tutorResource.js";

export async function getOrCreateTutorSession(userId, resourceType, resourceId) {
  const filter = sessionFilter(userId, resourceType, resourceId);
  let session = await TutorSession.findOne(filter).sort({ updatedAt: -1 });
  if (!session) {
    session = await TutorSession.create(
      sessionCreatePayload(userId, resourceType, resourceId)
    );
  }
  return session;
}

export async function loadTutorMessages(sessionId, limit = 24) {
  return TutorMessage.find({ sessionId, role: { $ne: "system" } })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean()
    .then((rows) => rows.reverse());
}

export async function saveTutorMessage(sessionId, role, content) {
  return TutorMessage.create({ sessionId, role, content });
}

export async function resetTutorSession(userId, resourceType, resourceId) {
  await TutorSession.deleteMany(sessionFilter(userId, resourceType, resourceId));
  return getOrCreateTutorSession(userId, resourceType, resourceId);
}

export { TUTOR_RESOURCE };
