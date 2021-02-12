import {getUser} from '../services/users';

const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');

const secret = (process.env.NODE_ENV === 'development')?
	'secret':
	uuidv4();

/*
 * Sign the user ID (SAPIN) and return as JWT token
 */
export const token = (userId) => jwt.sign(userId, secret);

/*
 * Verify a JWT token and, if valid, return the decoded payload
 */
export const verify = (req) => {
	let token = '';
	try {
		token = req.header('Authorization').replace('Bearer ', '');
	}
	catch (error) {
		throw 'No token';
	}
	try {
		return jwt.verify(token, secret);
	}
	catch (error) {
		throw 'Bad token';
	}
}

/*
 * Express middle middleware to authorize a request.
 * Validates the token, looks up the user associated with the token
 * and stores as req.user
 */
export const authorize = async (req, res, next) => {
	try {
		const userId = verify(req);
		const user = await getUser(userId);
		req.user = user;
		next();
	}
	catch (error) {
		console.log(error)
		res.status(403).send(error);
	}
}