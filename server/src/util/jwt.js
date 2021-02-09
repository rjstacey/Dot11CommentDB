const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');

const secret = (process.env.NODE_ENV === 'development')?
	'secret':
	uuidv4();

export const token = (payload) => jwt.sign(payload, secret);

export const verify = (req, res, next) => {
	var bearerHeader = req.headers["authorization"]
	if (typeof bearerHeader !== 'undefined') {
		const bearer = bearerHeader.split(" ");
		const bearerToken = bearer[1];
		jwt.verify(bearerToken, secret, (err, result) => {
			if (err)
				res.status(403).send('Bad token');
			else
				next();
		});
	}
	else {
		res.status(403).send('No token');
	}
};
