import * as React from "react";
import { FormControl } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";

import {
	globalFilterKey,
	AppTableDataSelectors,
	AppTableDataActions,
	FilterComp,
	CompOp,
} from "../store/appTableData";

interface GlobalFilterProps extends React.ComponentProps<typeof FormControl> {
	selectors: AppTableDataSelectors;
	actions: AppTableDataActions;
}

function GlobalFilter({
	selectors,
	actions,
	...otherProps
}: GlobalFilterProps) {
	const inputRef = React.useRef<HTMLInputElement>(null);
	const dispatch = useDispatch();
	const globalFilter = useSelector(selectors.selectGlobalFilter);
	const value =
		globalFilter && globalFilter.comps.length > 0
			? globalFilter.comps[0].value
			: "";

	React.useEffect(() => {
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
				} catch (err) {}
			}
		}
		dispatch(
			actions.setFilter({ dataKey: globalFilterKey, comps: [comp] })
		);
	};

	return (
		<FormControl
			id="app-table-global-filter"
			type="search"
			value={value}
			ref={inputRef}
			onChange={(e) => setGlobalFilter(e.target.value)}
			placeholder="Search..."
			{...otherProps}
		/>
	);
}

export default GlobalFilter;
