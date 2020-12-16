
export const UI_PREFIX = 'UI_'
export const UI_INIT = 'INIT'
export const UI_SET_PROPERTY = UI_PREFIX + 'SET_PROPERTY'

export const UI_INIT_TABLE = UI_PREFIX + 'INIT_TABLE'
export const UI_SET_TABLE_VIEW = UI_PREFIX + 'TABLE_VIEW'
export const UI_SET_TABLE_FIXED = UI_PREFIX + 'SET_TABLE_FIXED'
export const UI_SET_TABLE_COLUMN_VISIBLE = UI_PREFIX + 'SET_TABLE_COLUMN_VISIBLE'
export const UI_SET_TABLE_COLUMN_WIDTHS = UI_PREFIX + 'SET_TABLE_COLUMN_WIDTHS'

export const uiSetProperty = (dataSet, property, value) => ({type: UI_SET_PROPERTY, dataSet, property, value})

export const uiInitTable = (dataSet, view, fixed, columns) => ({type: UI_INIT_TABLE, dataSet, view, fixed, columns})
export const uiSetTableView = (dataSet, view) => ({type: UI_SET_TABLE_VIEW, dataSet, view})
export const uiSetTableFixed = (dataSet, view, fixed) => ({type: UI_SET_TABLE_FIXED, dataSet, view, fixed})
export const uiSetTableColumnVisible = (dataSet, view, key, visible) => ({type: UI_SET_TABLE_COLUMN_VISIBLE, dataSet, view, key, visible})
export const uiSetTableColumnWidths = (dataSet, view, widths) => ({type: UI_SET_TABLE_COLUMN_WIDTHS, dataSet, view, widths})