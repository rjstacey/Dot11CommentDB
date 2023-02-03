
const permissionsObj = {
	'wg_admin': 'Working group admin',
	'tg_admin': 'Task group admin',
	'meetings_ro': 'View meetings',
	'meetings_rw': 'Add, remove and modify meetings',
	'results_ro': 'View ballot results',
	'results_rw': 'Import and modify ballot results',
	'comment_rw': 'Import comments',
};

const permissions = Object.entries(permissionsObj).map(([scope, description]) => ({scope, description}));

export default permissions;
