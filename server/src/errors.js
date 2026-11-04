export class ApiError extends Error {
  constructor(status, message, code = "REQUEST_FAILED", details) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const knownDatabaseErrors = {
  ALREADY_REGISTERED: [409, "You already have a registration for this event."],
  EVENT_FULL: [409, "This event has reached capacity."],
  REGISTRATION_CLOSED: [409, "Registration for this event has closed."],
  EVENT_NOT_OPEN: [409, "This event is not open for registration."],
  EVENT_NOT_FOUND: [404, "Event not found."],
  CLUB_NOT_FOUND: [404, "Club not found."],
  ORGANIZER_REQUIRED: [403, "Organizer permission is required."],
  AUTHENTICATION_REQUIRED: [401, "Sign in to continue."]
};

export function fromSupabaseError(error) {
  const known = knownDatabaseErrors[error?.message];
  if (known) return new ApiError(known[0], known[1], error.message);
  if (error?.code === "23505") return new ApiError(409, "This record already exists.", "DUPLICATE_RECORD");
  if (error?.code === "23503") return new ApiError(400, "A referenced record does not exist.", "INVALID_REFERENCE");
  if (error?.code === "23514") return new ApiError(400, "One or more values violate a database constraint.", "CONSTRAINT_VIOLATION");
  if (error?.code === "42501") return new ApiError(403, "You do not have permission to change this resource.", "PERMISSION_DENIED");
  return new ApiError(400, "The request could not be completed.", "DATABASE_REQUEST_FAILED");
}

export function errorHandler(error, _request, response, _next) {
  if (error instanceof ApiError) {
    return response.status(error.status).json({
      error: { code: error.code, message: error.message, ...(error.details ? { details: error.details } : {}) }
    });
  }
  if (error?.name === "ZodError") {
    return response.status(400).json({
      error: { code: "VALIDATION_ERROR", message: "Check the submitted fields.", details: error.issues }
    });
  }
  if (error?.type === "entity.too.large") {
    return response.status(413).json({ error: { code: "PAYLOAD_TOO_LARGE", message: "Request body is too large." } });
  }
  if (error?.type === "entity.parse.failed") {
    return response.status(400).json({ error: { code: "INVALID_JSON", message: "Request body must be valid JSON." } });
  }
  console.error(error);
  return response.status(500).json({ error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred." } });
}
