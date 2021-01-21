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
				res.sendStatus(403);
			else
				next();
		});
	}
	else {
		res.sendStatus(403)
	}
};
