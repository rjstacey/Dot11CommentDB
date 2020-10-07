import {EXPAND_SET, EXPAND_TOGGLE} from '../actions/expand'

function expandReducer(state = [], action) {
	switch (action.type) {
		case EXPAND_SET:
			return action.ids.slice();

		case EXPAND_TOGGLE:
			const ids = state.slice();
			for (let id of action.ids) {
				const i = ids.indexOf(id)
				if (i >= 0)
					ids.splice(i, 1);
				else
					ids.push(id);
			}
			return ids;

		default:
			return state;
	}
}

export default expandReducer;