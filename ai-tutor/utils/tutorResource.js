export const TUTOR_RESOURCE = {
  COURSE: "course",
  NOTE: "note",
};

export function lectureFilter(resourceType, resourceId) {
  return resourceType === TUTOR_RESOURCE.NOTE
    ? { noteId: resourceId }
    : { courseId: resourceId };
}

export function chunkFilter(resourceType, resourceId) {
  return lectureFilter(resourceType, resourceId);
}

export function sessionFilter(userId, resourceType, resourceId) {
  return resourceType === TUTOR_RESOURCE.NOTE
    ? { userId, noteId: resourceId }
    : { userId, courseId: resourceId };
}

export function sessionCreatePayload(userId, resourceType, resourceId) {
  const base = { userId, title: "AI Tutor" };
  if (resourceType === TUTOR_RESOURCE.NOTE) {
    return { ...base, noteId: resourceId, resourceType: TUTOR_RESOURCE.NOTE };
  }
  return { ...base, courseId: resourceId, resourceType: TUTOR_RESOURCE.COURSE };
}

export function parseResourceParams(params) {
  if (params.noteId) {
    return { resourceType: TUTOR_RESOURCE.NOTE, resourceId: params.noteId };
  }
  if (params.courseId) {
    return { resourceType: TUTOR_RESOURCE.COURSE, resourceId: params.courseId };
  }
  return null;
}
