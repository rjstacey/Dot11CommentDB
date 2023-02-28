/*
 * Maintain users cache
 */
import {selectUsers} from '../services/users';

const superUser = {
	SAPIN: 5073,
	Name: 'Robert Stacey',
	Email: 'rjstacey@gmail.com',
	Access: 3,
	Permissions: ['wg_admin']
};

const userCache = {};

export async function init() {
	await selectUsers().then(users => users.forEach(u => setUser(u.SAPIN, u)));

	/* This is a hack; make sure we don't loose the superuser */
	const user = getUser(superUser.SAPIN);
	if (!user) {
		console.warn('Superuser missing');
		setUser(superUser.SAPIN, superUser);
	}
	else if (user.Access < 3) {
		console.warn('Superuser has insufficient access');
		user.Access = 3;
	}
	else if (!Array.isArray(user.Permissions)) {
		console.warn('Superuser has no Permissions array');
		user.Permissions = superUser.Permissions;
	} 
	else if (!user.Permissions.includes('wg_admin')) {
		console.warn('Superuser does not have "wg_admin" scope');
		user.Permissions.push('wg_admin');
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
