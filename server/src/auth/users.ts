/*
 * Maintain users cache
 */
import { selectUsers, User } from '../services/users';

const superUser: User = {
	SAPIN: 5073,
	Name: 'Robert Stacey',
	Email: 'rjstacey@gmail.com',
	Access: 3,
	Permissions: ['wg_admin'],
	Status: 'Voter'
};

const userCache: Record<number, User> = {};

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

export const getUser = (sapin: number) => userCache[sapin];

export const setUser = (sapin: number, user: User) => userCache[sapin] = user;

export const delUser = (sapin: number) => delete userCache[sapin];

export default {
	init,
	getUser,
	setUser,
	delUser
};
