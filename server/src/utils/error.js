
/*
 * Authorization error; return status 401 to client
 * Used when we require the user to log in again
 */
export class AuthError extends Error {
	name = "AuthError";
}

/*
 * Resouce not found error; return status 404 to client
 */
export class NotFoundError extends Error {
	name = "NotFoundError";
}
