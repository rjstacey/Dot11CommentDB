import type { PayloadAction } from "@reduxjs/toolkit";
import { createSelector } from "reselect"; /* Use older version; the newer version does not handle typescript generics well */

export type ChangeableColumnProperties = {
	width: number;
	shown: boolean;
	unselectable?: boolean;
};

export type TableConfig = {
	fixed: boolean;
	columns: { [key: string]: ChangeableColumnProperties };
};
export type TablesConfig = { [tableView: string]: TableConfig };

export type PanelConfig = { width: number; isSplit: boolean };
export type PanelsConfig = { [tableView: string]: PanelConfig };

export type UiProperty = { property: string; value: any };
export type UiProperties = { [property: string]: any };

const defaultColumnProperties: ChangeableColumnProperties = {
	width: 100,
	shown: false,
	unselectable: false,
};

const defaultTableView = "default";
const defaultTableConfig: TableConfig = { fixed: false, columns: {} };
const defaultPanelConfig: PanelConfig = { width: 0.5, isSplit: false };

const name = "ui";

export type UiState = {
	[name]: {
		tableConfig: TableConfig;
		panelsConfig: PanelsConfig;
		[property: string]: any;
	};
};

export function createUiSubslice(dataSet: string) {
	const initialUiState = {
		tableConfig: defaultTableConfig,
		panelsConfig: { [defaultTableView]: defaultPanelConfig },
	};
	const initialState: UiState = { [name]: initialUiState };

	const reducers = {
		setProperty(state: UiState, action: PayloadAction<UiProperty>) {
			const ui = state[name];
			const { property, value } = action.payload;
			ui[property] = value;
		},
		setUiProperties(state: UiState, action: PayloadAction<UiProperties>) {
			state[name] = { ...state[name], ...action.payload };
		},
		setTableConfig(
			state: UiState,
			action: PayloadAction<TableConfig>
		) {
			const ui = state[name];
			ui.tableConfig = action.payload;
		},
		adjustTableColumnWidth(
			state: UiState,
			action: PayloadAction<{
				key: string;
				delta: number;
			}>
		) {
			const ui = state[name];
			const tableConfig = ui.tableConfig;
			const { key, delta } = action.payload;
			const column = tableConfig.columns[key];
			if (column)
				column.width = Math.max(0, column.width + delta);
		},
		setTableColumnShown(
			state: UiState,
			action: PayloadAction<{
				key: string;
				shown: boolean;
			}>
		) {
			const ui = state[name];
			const tableConfig = ui.tableConfig;
			const { key, shown } = action.payload;
			if (tableConfig?.columns[key]) {
				tableConfig.columns[key].shown = shown;
			}
		},
		setTableColumnsShown(
			state: UiState,
			action: PayloadAction<Record<string, boolean>>
		) {
			const ui = state[name];
			const tableConfig = ui.tableConfig;
			const shown = action.payload;
			for (const [key, isShown] of Object.entries(shown)) {
				if (tableConfig?.columns[key])
					tableConfig.columns[key].shown = isShown;
			}
		},
		toggleTableFixed(
			state: UiState,
		) {
			const ui = state[name];
			const tableConfig = ui.tableConfig;
			if (tableConfig) tableConfig.fixed = !tableConfig.fixed;
		},
		adjustPanelWidth(
			state: UiState,
			action: PayloadAction<{ delta: number }>
		) {
			const ui = state[name];
			let { delta } = action.payload;
			const panelConfig = ui.panelConfig ?? { ...defaultPanelConfig };
			panelConfig.width += delta;
			ui.panelConfig = panelConfig;
		},
		setPanelWidth(
			state: UiState,
			action: PayloadAction<{	width: number }>
		) {
			const ui = state[name];
			let { width } = action.payload;
			const panelConfig = ui.panelConfig ?? { ...defaultPanelConfig };
			panelConfig.width = width;
			ui.panelConfig = panelConfig;
		},
		setPanelIsSplit(
			state: UiState,
			action: PayloadAction<{ isSplit: boolean }>
		) {
			const ui = state[name];
			let { isSplit } = action.payload;
			const panelConfig = ui.panelConfig ?? { ...defaultPanelConfig };
			panelConfig.isSplit = isSplit;
			ui.panelConfig = panelConfig;
		},
	};

	return {
		name,
		initialState,
		reducers,
	};
}

export function getUiSelectors<S>(selectState: (state: S) => UiState) {
	/** Select all UI properties */
	const selectUiProperties = (state: S) => selectState(state)[name];

	const selectTableConfig = (state: S): TableConfig | undefined => selectUiProperties(state).tableConfig;

	/** Select panel config for the current view */
	const selectPanelConfig = (state: S): PanelConfig => {
		const { panelConfig } = selectUiProperties(state);
		return panelConfig ?? defaultPanelConfig;
	};

	return {
		selectUiProperties,
		selectPanelConfig,
		selectTableConfig
	};
}
