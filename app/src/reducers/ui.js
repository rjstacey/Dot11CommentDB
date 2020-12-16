import Immutable from 'immutable'
import {
	UI_INIT,
	UI_SET_PROPERTY,
	UI_INIT_TABLE,
	UI_SET_TABLE_VIEW,
	UI_SET_TABLE_FIXED,
	UI_SET_TABLE_COLUMN_VISIBLE,
	UI_SET_TABLE_COLUMN_WIDTHS
} from '../actions/ui'

const defaultState = {
	tableView: 'default',
	tablesConfig: {fixed: false, columns: Immutable.Map()}
} 

function uiReducer(state = defaultState, action) {
	let tablesConfig, columns;
	switch (action.type) {
		case UI_INIT:
			return {...state, ...action.state};
		case UI_SET_PROPERTY:
			if (!state.hasOwnProperty(action.property))
				console.warn('No property ' + action.property)
			return {...state, [action.property]: action.value};
		case UI_INIT_TABLE:
			tablesConfig = {...state.tablesConfig, [action.view]: {fixed: action.fixed, columns: action.columns}};
			return {...state, tablesConfig};
		case UI_SET_TABLE_VIEW:
			return {...state, view: action.view}
		case UI_SET_TABLE_FIXED:
			tablesConfig = {...state.tablesConfig, [action.view]: {...state.tablesConfig[action.view], fixed: action.fixed}};
			return {...state, tablesConfig};
		case UI_SET_TABLE_COLUMN_VISIBLE:
			columns = state.tablesConfig[action.view].columns;
			columns = columns.update(action.key, col => ({...col, visible: action.visible}));
			tablesConfig = {...state.tablesConfig, [action.view]: {...state.tablesConfig[action.view], columns}};
			return {...state, tablesConfig};
		case UI_SET_TABLE_COLUMN_WIDTHS:
			columns = state.tablesConfig[action.view].columns;
			action.widths.forEach((width, key) => columns = columns.update(key, col => ({...col, width})));
			tablesConfig = {...state.tablesConfig, [action.view]: {...state.tablesConfig[action.view], columns}};
			return {...state, tablesConfig};
		default:
			return state;
	}
}

export default uiReducer;