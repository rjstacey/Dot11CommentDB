/** Bad request; return 400 to client. */
export class BadRequestError extends Error {
	name = "BadRequestError";
	constructor(msg = "Bad request") {
		super(msg);
	}
}

/** Authorization error; return 401 to client.
 * Used when we require the user to log in again. */
export class AuthError extends Error {
	name = "AuthError";
	constructor(msg = "Unauthorized") {
		super(msg);
	}
}

/** Access forbidden; return 403 to client. */
export class ForbiddenError extends Error {
	name = "ForbiddenError";
	constructor(msg = "Insufficient karma") {
		super(msg);
	}
}

/** Resouce not found error; return 404 to client. */
export class NotFoundError extends Error {
	name = "NotFoundError";
	constructor(msg = "Not found") {
		super(msg);
	}
}
