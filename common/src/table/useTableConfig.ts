import { useEffect, useMemo } from "react";
import type { EntityId } from "@reduxjs/toolkit";
import isEqual from "lodash.isequal";
import {
    type TablesConfig,
    type TableConfig,
    useAppTableDispatch,
    useAppTableSelector,
} from "../store/appTableData";
import type { AppTableDataSelectors, AppTableDataActions, ColumnProperties } from "./AppTable";

export function useSetDefaultTablesConfig<S, T1 extends {}, T2 extends T1, Id extends EntityId>(
	defaultTablesConfigIn: TablesConfig | undefined,
	columns: ColumnProperties<S, T1, T2, Id>[],
    selectors: AppTableDataSelectors<S, T1, T2, Id>,
    actions: AppTableDataActions<T1, Id>
) {
    const dispatch = useAppTableDispatch();
	const tableConfigDefault = defaultTablesConfigIn?.["default"];
	const tableConfigCurrent = useAppTableSelector(selectors.selectTableConfig);

	const tableConfig = useMemo(() => {
		let config: TableConfig = {
			fixed: false,
			columns: {},
		};
		if (!tableConfigDefault) {
			for (const col of columns) {
				config.columns[col.key] = {
					unselectable: true,
					shown: true,
					width: col.width || 100,
				};
			}
		}
		else {
			config.fixed = tableConfigDefault.fixed;
			for (const col of columns) {
				let colConfigDefault = tableConfigDefault.columns[col.key];
				if (!colConfigDefault) {
					console.warn(
						`defaultTableConfig does not include column with key '${col.key}'`,
					);
					colConfigDefault = {
						unselectable: true,
						shown: true,
						width: col.width || 100,
					};
				}
				config.columns[col.key] = colConfigDefault;
			}
		}
		if (tableConfigCurrent)
			config.fixed = tableConfigCurrent.fixed;
		for (const col of columns) {
			const colConfigCurrent = tableConfigCurrent?.columns[col.key];
			const colConfigDefault = config.columns[col.key];
			config.columns[col.key]	= {
				unselectable: colConfigCurrent?.unselectable ?? colConfigDefault.unselectable,
				shown: colConfigCurrent?.shown ?? colConfigDefault.shown,
				width: colConfigCurrent?.width ?? colConfigDefault.width,
			};
		}
		if (!isEqual(config, tableConfigCurrent)) {
			dispatch(actions.setTableConfig(config));
		}
		return config;
	}, [tableConfigCurrent, tableConfigDefault, columns]);

	return tableConfig;
}
