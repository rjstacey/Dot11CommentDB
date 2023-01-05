/*
 * Maintain users cache
 */
import {getUsers} from '../services/members'

const superUser = {
	SAPIN: 5073,
	Name: 'Robert Stacey',
	Email: 'rjstacey@gmail.com',
	Access: 3
};

const userCache = {};

export async function init() {
	const {users} = await getUsers();
	for (const u of users)
		setUser(u.SAPIN, u);

	/* This is a hack; make sure we don't loose the superuser */
	const user = getUser(superUser.SAPIN);
	if (!user) {
		console.log('Superuser missing');
		setUser(superUser.SAPIN, superUser);
	}
	else if (user.Access < 3) {
		console.log('Superuser has insufficient access');
		user.Access = 3;
	}
}

export const getUser = (sapin) => userCache[sapin];

export const setUser = (sapin, user) => userCache[sapin] = user;

export const delUser = (sapin) => delete userCache[sapin];

export default {
	init,
	getUser,
	setUser,
	delUser
};
