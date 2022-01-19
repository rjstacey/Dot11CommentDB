import {getUser} from './users';

const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');

const secret = (process.env.NODE_ENV === 'development')? 'secret': uuidv4();
//const secret = uuidv4();

/*
 * Sign the user ID (SAPIN) and return as JWT token
 */
export const token = (userId) => jwt.sign(userId, secret);

/*
 * Get token from header
 */
const getToken = (req) => {
	try {
		return req.header('Authorization').replace('Bearer ', '');
	}
	catch (error) {
		throw 'No token'
	}
}

/*
 * Verify a JWT token and, if valid, return the decoded payload
 */
export const verify = (req) => {
	const token = getToken(req);
	try {
		return jwt.verify(token, secret);
	}
	catch (error) {
		throw new Error('Bad token');
	}
}


/*
 * Express middleware to authorize a request.
 * Validates the token, looks up the user associated with the token
 * and stores as req.user
 */
export const authorize = async (req, res, next) => {
	try {
		const token = getToken(req);
		let userId;
		try {
			userId = jwt.verify(token, secret);
		}
		catch (error) {
			console.warn('unauthorized');
			res.status(401).send('Unauthorized');
			return;
		}
		const user = await getUser(userId);
		if (!user)
			throw new Error('Unknown user');
		req.user = user;
		next();
	}
	catch (error) {
		console.log(error)
		res.status(403).send(error);
	}
}