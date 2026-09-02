import { useRef, useEffect } from "react";
import { FormControl } from "react-bootstrap";
import type { EntityId } from "@reduxjs/toolkit";

import {
	globalFilterKey,
	AppTableDataSelectors,
	AppTableDataActions,
	FilterComp,
	CompOp,
	useAppTableDispatch,
	useAppTableSelector,
} from "../store/appTableData";

interface GlobalFilterProps<S, T1 extends {}, T2 extends T1, Id extends EntityId> extends React.ComponentProps<typeof FormControl> {
	selectors: AppTableDataSelectors<S, T1, T2, Id>;
	actions: AppTableDataActions<T1, Id>;
}

function GlobalFilter<S, T1 extends {}, T2 extends T1, Id extends EntityId>({
	selectors,
	actions,
	...otherProps
}: GlobalFilterProps<S, T1, T2, Id>) {
	const inputRef = useRef<HTMLInputElement>(null);
	const dispatch = useAppTableDispatch();
	const globalFilter = useAppTableSelector(selectors.selectGlobalFilter);
	const value =
		globalFilter && globalFilter.comps.length > 0
			? globalFilter.comps[0].value
			: "";

	useEffect(() => {
		if (value === "//" && inputRef.current)
			inputRef.current.setSelectionRange(1, 1);
	}, [value]);

	const setGlobalFilter = (newValue: string) => {
		if (!value && newValue === "/") {
			// If search is empty and / is pressed, then add // to search
			// and position the cursor between the slashes (using the useEffect above)
			newValue = "//";
		}
		const comp: FilterComp = {
			value: newValue,
			operation: CompOp.CONTAINS,
		};
		if (newValue[0] === "/") {
			const parts = newValue.split("/");
			if (parts.length > 2) {
				// User is entering a regex in the form /pattern/flags.
				// If the regex doesn't validate then ignore it
				try {
					new RegExp(parts[1], parts[2]);
					comp.operation = CompOp.REGEX;
				} catch (err) { }
			}
		}
		if (newValue) {
			dispatch(
				actions.setFilter({ dataKey: globalFilterKey, comps: [comp] }),
			);
		} else {
			dispatch(actions.clearFilter({ dataKey: globalFilterKey }));
		}
	};

	return (
		<FormControl
			id="app-table-global-filter"
			type="search"
			value={value}
			ref={inputRef}
			onChange={(e) => setGlobalFilter(e.target.value)}
			placeholder="Search table..."
			{...otherProps}
		/>
	);
}

export default GlobalFilter;
