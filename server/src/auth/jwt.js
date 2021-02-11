import {getUser} from '../services/users';

const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');

const secret = (process.env.NODE_ENV === 'development')?
	'secret':
	uuidv4();

export const token = (userId) => jwt.sign(userId, secret);

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