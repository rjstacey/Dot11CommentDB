/**Authorization error; return 401 to client.
 * Used when we require the user to log in again. */
export class AuthError extends Error {
	name = "AuthError";
}

/** Resouce not found error; return 404 to client. */
export class NotFoundError extends Error {
	name = "NotFoundError";
}

/**Access forbidded; return 403 to client. */
export class ForbiddenError extends Error {
	name = "ForbiddenError";
	constructor(msg = "Insufficient karma") {
		super(msg);
	}
}
