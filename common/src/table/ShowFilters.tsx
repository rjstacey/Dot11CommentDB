import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import {
	globalFilterKey,
	Fields,
	Filters,
	AppTableDataSelectors,
	AppTableDataActions,
	CompOpValue,
	CompOp,
	FilterComp,
} from "../store/appTableData";

import styles from "./ShowFilters.module.css";

const ActiveFilter = ({
	remove,
	children,
}: {
	remove: React.MouseEventHandler;
	children?: React.ReactNode;
}) => (
	<div className={styles["filter-container"]} role="listitem">
		{children && <span className={styles["filter-item"]}>{children}</span>}
		<i
			className="action-icon bi-x"
			style={{ minWidth: 16 }}
			onClick={remove}
		/>
	</div>
);

function compPrefix(comp: FilterComp): string {
	return (
		(
			{
				[CompOp.GTEQ]: "≥ ",
				[CompOp.LTEQ]: "≤ ",
				[CompOp.GT]: "> ",
				[CompOp.LT]: "< ",
				[CompOp.NOTBLANK]: "Not ",
			} as Record<string, string>
		)[comp.operation] || ""
	);
}

function renderActiveFilters({
	fields,
	filters,
	removeFilter,
	clearAllFilters,
}: {
	fields: Fields;
	filters: Filters;
	removeFilter: (dataKey: string, value: any, operation: CompOpValue) => void;
	clearAllFilters: () => void;
}) {
	let elements: React.ReactNode[] = [];
	for (const [dataKey, filter] of Object.entries(filters)) {
		if (dataKey === globalFilterKey) continue;
		if (!fields[dataKey]) {
			console.warn(`${dataKey} not present in fields`);
			continue;
		}
		const { label, dataRenderer } = fields[dataKey];
		const { comps, options } = filter;
		if (comps.length > 0) {
			elements.push(
				<span key={dataKey} className={styles["filter-label"]}>
					{label + ":"}
				</span>
			);
			comps.forEach((comp, i) => {
				const o = options?.find((o) => o.value === comp.value);
				let s = o?.label || dataRenderer?.(comp.value) || comp.value;
				if (s === null || s === "") s = "(Blank)";
				const label = compPrefix(comp) + s;
				elements.push(
					<ActiveFilter
						key={`${dataKey}_${i}`}
						remove={() =>
							removeFilter(dataKey, comp.value, comp.operation)
						}
					>
						{label}
					</ActiveFilter>
				);
			});
		}
	}
	if (elements.length > 2) {
		elements.push(
			<label key="clear_all_label" className={styles["filter-label"]}>
				Clear All:
			</label>
		);
		elements.push(
			<ActiveFilter key="clear_all" remove={clearAllFilters} />
		);
	}
	return elements;
}

type ShowFiltersProps = {
	className?: string;
	style?: React.CSSProperties;
	fields: Fields;
	selectors: AppTableDataSelectors;
	actions: AppTableDataActions;
};

function ShowFilters({
	className,
	style,
	fields,
	selectors,
	actions,
}: ShowFiltersProps) {
	const dispatch = useDispatch();

	const totalRows = useSelector(selectors.selectIds).length;
	const shownRows = useSelector(selectors.selectSortedFilteredIds).length;
	const filters = useSelector(selectors.selectFilters);

	const activeFilterElements = React.useMemo(() => {
		const removeFilter = (
			dataKey: string,
			value: any,
			operation: CompOpValue
		) => dispatch(actions.removeFilter({ dataKey, value, operation }));
		const clearAllFilters = () => dispatch(actions.clearAllFilters());

		return renderActiveFilters({
			fields,
			filters,
			removeFilter,
			clearAllFilters,
		});
	}, [actions, fields, filters, dispatch]);

	return (
		<div
			className={styles["container"] + (className ? " " + className : "")}
			style={style}
		>
			<div className={styles["label-block"]}>
				<span className="label">Filters:</span>
				<span>{`Showing ${shownRows} of ${totalRows}`}</span>
			</div>
			<div className={styles["content-block"]}>
				{activeFilterElements.length ? (
					activeFilterElements
				) : (
					<span className={styles["placeholder"]}>No filters</span>
				)}
			</div>
		</div>
	);
}

export default ShowFilters;
