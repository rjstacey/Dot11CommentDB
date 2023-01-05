
const permissionsObj = {
	'wgAdmin': 'Working group admin',
	'tgAdmin': 'Task group admin',
	'results_ro': 'Ability to view ballot results',
	'results_rw': 'Ability to adjust ballot results',
	'comment_rw': 'Ability to modify comments'
};

const permissions = Object.entries(permissionsObj).map(([scope, description]) => ({scope, description}));

export default permissions;
