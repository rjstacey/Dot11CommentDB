import {createSlice} from '@reduxjs/toolkit'

const sliceName = 'ui';

const initialTableConfig = {fixed: false, columns: {}}

const tablesConfigSlice = createSlice({
	name: sliceName,
	initialState: {
  		view: 'default',
  		tablesConfig: {
  			default: initialTableConfig
  		}
  	},
  	reducers: {
  		setTableView(state, action) {
  			const {view} = action.payload;
			state.view = view;
			if (!state.tablesConfig[view])
				state.tablesConfig[view] = initialTableConfig;
  		},
		initTableConfig(state, action) {
			const {view, fixed, columns} = action.payload;
			state.tablesConfig[view] = {fixed, columns};
		},
		upsertTableColumns(state, action) {
			const {view, columns} = action.payload;
			if (!state.tablesConfig[view])
				state.tablesConfig[view] = {fixed: false, columns: {}}; 
			const tableConfig = state.tablesConfig[view]
			for (const key of Object.keys(columns)) {
				if (!tableConfig.columns[key])
					tableConfig.columns[key] = {}
				tableConfig.columns[key] = {...tableConfig.columns[key], ...columns[key]}
			}
		},
		upsertTableColumn(state, action) {
			const {view, column} = action.payload;
			if (!state.tablesConfig[view])
				state.tablesConfig[view] = initialTableConfig; 
			const tableConfig = state.tablesConfig[view]
			const key = column.key;
			if (!tableConfig.columns[key])
				tableConfig.columns[key] = {}
			tableConfig.columns[key] = {...tableConfig.columns[key], ...column}
		},
		toggleTableFixed(state, action) {
			const {view} = action.payload;
			state.tablesConfig[view].fixed = !state.tablesConfig[view].fixed;
		},
		setTableColumnVisible(state, action) {
			const {view, key, visible} = action.payload;
			if (!state.tablesConfig[view])
				state.tablesConfig[view] = initialTableConfig;
			const col = state.tablesConfig[view].columns[key];
			state.tablesConfig[view].columns[key] = {...col, visible}
		},
		setProperty(state, action) {
			const {property, value} = action.payload;
			state[property] = value;
		}
  	}
});

export default tablesConfigSlice;

export const setTableView = (dataSet, view) => ({type: dataSet + '/' + sliceName + '/setTableView', payload: {view}});
export const upsertTableColumns = (dataSet, view, columns) => ({type: dataSet + '/' + sliceName + '/upsertTableColumns', payload: {view, columns}});
export const upsertTableColumn = (dataSet, view, column) => ({type: dataSet + '/' + sliceName + '/upsertTableColumn', payload: {view, column}});
export const toggleTableFixed = (dataSet, view) => ({type: dataSet + '/' + sliceName + '/toggleTableFixed', payload: {view}});
export const setProperty = (dataSet, property, value) => ({type: dataSet + '/' + sliceName + '/setProperty', payload: {property, value}});
