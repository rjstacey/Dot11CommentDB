import {SELECT_SET, SELECT_TOGGLE} from '../actions/select'

function selectReducer(state = [], action) {
	switch (action.type) {
		case SELECT_SET:
			return action.ids.slice();

		case SELECT_TOGGLE:
			const selected = state.slice();
			for (let id of action.ids) {
				const i = selected.indexOf(id)
				if (i >= 0)
					selected.splice(i, 1);
				else
					selected.push(id);
			}
			return selected;

		default:
			return state;
	}
}

export default selectReducer;