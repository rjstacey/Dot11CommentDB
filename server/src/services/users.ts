import db from '../utils/database';
import type { AxiosInstance } from 'axios';

/*
 * HACK - superuser record
 * we don't want to loose superuser
 * or loose superuser permissions
 */
const superUser: User = {
	SAPIN: 5073,
	Name: 'Robert Stacey',
	Email: 'rjstacey@gmail.com',
	Status: 'Voter',
	Access: 3,
	Permissions: ['wg_admin']
};

function superUserHack(user: User) {
	if (!user) {
		console.warn('Superuser missing');
		user = superUser;
	}
	else {
		if (user.Access < 3) {
			console.warn('Superuser has insufficient access');
			user = {...user, Access: 3};
		}

		if (!Array.isArray(user.Permissions)) {
			console.warn('Superuser has no Permissions array');
			user = {...user, Permissions: superUser.Permissions};
		} 
		else if (!user.Permissions.includes('wg_admin')) {
			console.warn('Superuser does not have "wg_admin" scope');
			user = {...user, Permissions: ['wg_admin', ...user.Permissions]};
		}
	}
	return user;
}

export type User = {
	SAPIN: number;
	Name: string;
	Email: string;
	Status: string;
	Access: number;
	Permissions: string[];
	ieeeClient?: AxiosInstance;
}


export async function selectUser({SAPIN, Email}: {SAPIN?: number; Email?: string}) {
	const sql =
		'SELECT ' +
			'm.SAPIN, Name, Email, Status, Access, ' +
			'COALESCE(Permissions, JSON_ARRAY()) AS Permissions ' +
		'FROM members m ' +
			'LEFT JOIN (SELECT SAPIN, JSON_ARRAYAGG(scope) AS Permissions FROM permissions GROUP BY SAPIN) AS p ON m.SAPIN=p.SAPIN ' +
		'WHERE ' + (SAPIN? `m.SAPIN=${db.escape(SAPIN)}`: `m.Email=${db.escape(Email)}`);
	let [user] = await db.query(sql) as User[];

	if (SAPIN === superUser.SAPIN || Email === superUser.Email)
		user = superUserHack(user);

	return user;
}

/*
 * Maintain users cache
 */

const userCache: Record<number, User> = {};

export async function getUser(sapin: number) {
	let user = userCache[sapin];
	if (!user) {
		user = await selectUser({SAPIN: sapin});
		if (user)
			userCache[sapin] = user;
	}
	return user;
}

export function setUser(sapin: number, user: User) {
	userCache[sapin] = {...userCache[sapin], ...user};
}

export const delUser = (sapin: number) => delete userCache[sapin];

/* User permissions */
const permissionsObj = {
	'wg_admin': 'Working group admin',
	'subgroup_admin': 'Subgroup admin',
	'meetings_ro': 'View meetings',
	'meetings_rw': 'Add, remove and modify meetings',
	'results_ro': 'View ballot results',
	'results_rw': 'Import and modify ballot results',
	'comment_rw': 'Import comments',
};

export const permissions = Object.entries(permissionsObj).map(([scope, description]) => ({scope, description}));

export function userIsWGAdmin(user: User) {
	const perm = user.Permissions;
	if (!Array.isArray(perm))
		return false;

	return perm.includes('wg_admin');
}

export function userIsSubgroupAdmin(user: User) {
	const perm = user.Permissions;
	if (!Array.isArray(perm))
		return false;

	return perm.includes('wg_admin') || perm.includes('subgroup_admin');
}

export function userIsMember(user: User) {
	return /^(Voter|Potential Voter|Aspirant|ExOfficio)$/.exec(user.Status)
}
