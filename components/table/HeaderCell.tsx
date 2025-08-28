import * as React from "react";
import ReactDOM from "react-dom";
import { Form, Row, Col, Button, Dropdown } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import { FixedSizeList as List } from "react-window";

import { DateFilter } from "./DateFilter";

import {
	sortOptions,
	SortDirection,
	SortDirectionValue,
	Option,
	AppTableDataSelectors,
	AppTableDataActions,
	FilterComp,
	CompOp,
	FieldType,
	CompOpValue,
	FieldTypeValue,
	getCompFunc,
} from "../store/appTableData";

import type { HeaderCellRendererProps } from "./AppTable";

import styles from "./HeaderCell.module.css";

const Item = ({
	isSelected,
	disabled,
	...props
}: {
	isSelected: boolean;
	disabled?: boolean;
} & React.HTMLAttributes<HTMLDivElement>) => (
	<div
		className={
			"item" +
			(isSelected ? " selected" : "") +
			(disabled ? " disabled" : "")
		}
		{...props}
	/>
);

function IconSort({
	style,
	type,
	direction,
}: {
	style?: React.CSSProperties;
	type: FieldTypeValue;
	direction: SortDirectionValue;
}) {
	let className = "bi-sort";
	if (type === FieldType.NUMERIC) className += "-numeric";
	if (type === FieldType.STRING) className += "-alpha";
	if (direction === SortDirection.ASC) className += "-down";
	else if (direction === SortDirection.DESC) className += "-up";
	else return null;
	if (!/numeric|alpha/.test(className)) className += "-alt";
	return <i className={className} style={style} />;
}

function SortComponent({
	dataKey,
	selectors,
	actions,
}: {
	dataKey: string;
	selectors: AppTableDataSelectors;
	actions: AppTableDataActions;
}) {
	const { direction, type } = useSelector((state) =>
		selectors.selectSort(state, dataKey)
	);
	const dispatch = useDispatch();
	const setSort = React.useCallback(
		(direction: SortDirectionValue) =>
			dispatch(actions.setSortDirection({ dataKey, direction })),
		[dispatch, actions, dataKey]
	);

	return (
		<Form.Group
			as={Row}
			className="d-flex justify-content-between align-items-center mb-3"
		>
			<Form.Label column>Sort:</Form.Label>
			<Col className="d-flex gap-2">
				<Button
					variant="outline-secondary"
					onClick={(e) =>
						setSort(
							direction === SortDirection.ASC
								? SortDirection.NONE
								: SortDirection.ASC
						)
					}
					active={direction === SortDirection.ASC}
				>
					<IconSort type={type} direction={SortDirection.ASC} />
				</Button>
				<Button
					variant="outline-secondary"
					onClick={(e) =>
						setSort(
							direction === SortDirection.DESC
								? SortDirection.NONE
								: SortDirection.DESC
						)
					}
					active={direction === SortDirection.DESC}
				>
					<IconSort type={type} direction={SortDirection.DESC} />
				</Button>
			</Col>
		</Form.Group>
	);
}

type FilterItem = Option & FilterComp;

function FilterComponent({
	dataKey,
	selectors,
	actions,
	dataRenderer,
	customFilterElement,
}: {
	dataKey: string;
	selectors: AppTableDataSelectors;
	actions: AppTableDataActions;
	dataRenderer?: (value: any) => string;
	customFilterElement?: React.ReactNode;
}) {
	const [search, setSearch] = React.useState("");
	const inputRef = React.useRef<HTMLInputElement>(null);

	const dispatch = useDispatch();

	const selectSort = React.useCallback(
		(state: any) => selectors.selectSort(state, dataKey),
		[selectors, dataKey]
	);
	const selectFilter = React.useCallback(
		(state: any) => selectors.selectFilter(state, dataKey),
		[selectors, dataKey]
	);
	const sort = useSelector(selectSort);
	const filter = useSelector(selectFilter);
	const selected = useSelector(selectors.selectSelected);
	const entities = useSelector(selectors.selectEntities);
	const ids = useSelector(selectors.selectIds);
	const getField = selectors.getField;

	const values = React.useMemo(
		() => [...new Set(ids.map((id) => getField(entities[id]!, dataKey)))],
		[dataKey, ids, entities, getField]
	);

	const options: Option[] = React.useMemo(() => {
		if (!filter) return [];

		if (filter.options) return filter.options;

		return values.map<Option>((v) => ({
			value: v,
			label: dataRenderer?.(v) || v,
		}));
	}, [values, dataRenderer, filter]);

	const filterSelected = React.useCallback(() => {
		const comps: FilterComp[] = selected.map((id) => ({
			value: getField(entities[id]!, dataKey),
			operation: CompOp.EQ,
		}));
		dispatch(actions.setFilter({ dataKey, comps }));
	}, [dispatch, actions, dataKey, selected, entities, getField]);

	const isFilterSelected = React.useMemo(() => {
		if (!filter) return false;
		const list = selected.map((id) => getField(entities[id]!, dataKey));
		return filter.comps.map((comp) => comp.value).join() === list.join();
	}, [filter, dataKey, selected, entities, getField]);

	const items = React.useMemo(() => {
		let searchItems: FilterItem[] = [];
		if (filter) {
			searchItems = filter.comps
				.filter(
					(comp) =>
						comp.operation !== CompOp.EQ &&
						comp.operation !== CompOp.BLANK &&
						comp.operation !== CompOp.NOTBLANK
				)
				.map((comp) => {
					let label = "Contains: ";
					if (comp.operation === CompOp.REGEX) {
						label = "Regex: ";
					} else if (
						filter.type === FieldType.DATE &&
						comp.operation === CompOp.GT
					) {
						label = "After: ";
					} else if (
						filter.type === FieldType.DATE &&
						comp.operation === CompOp.LT
					) {
						label = "Before: ";
					} else if (filter.type === FieldType.NUMERIC) {
						label =
							(
								{
									[CompOp.GTEQ]: "≥ ",
									[CompOp.LTEQ]: "≤ ",
									[CompOp.GT]: "> ",
									[CompOp.LT]: "< ",
								} as Record<string, string>
							)[comp.operation] || "";
					}
					label += comp.value;
					return {
						label,
						value: comp.value,
						operation: comp.operation,
					};
				});
		}

		let exactItems: FilterItem[] = options
			.filter((o) => o.value !== null && o.value !== "")
			.map((o) => ({
				...o,
				operation: CompOp.EQ,
			}));
		const hasBlank =
			options.findIndex((o) => o.value === null || o.value === "") >= 0;
		if (hasBlank) {
			exactItems.unshift({
				value: null,
				label: "(Blank)",
				operation: CompOp.BLANK,
			});
			exactItems.unshift({
				value: null,
				label: "Not (Blank)",
				operation: CompOp.NOTBLANK,
			});
		}

		if (search) {
			let item: FilterItem | undefined = undefined;
			const parts = search.split("/");
			if (search[0] === "/" && parts.length > 2) {
				// User is entering a regex in the form /pattern/flags.
				// If the regex doesn't validate then ignore it
				try {
					let regexp = new RegExp(parts[1], parts[2]);
					item = {
						label: "Regex: " + regexp.toString(),
						value: search,
						operation: CompOp.REGEX,
					};
				} catch (err) {}
			} else if (
				filter.type === FieldType.NUMERIC &&
				(search[0] === ">" || search[0] === "<")
			) {
				const m = /^(>=|<=|>|<)\s*(\d+)/.exec(search);
				if (m) {
					let operation: CompOpValue;
					if (m[1] === ">=") operation = CompOp.GTEQ;
					else if (m[1] === "<=") operation = CompOp.LTEQ;
					else if (m[1] === ">") operation = CompOp.GT;
					else operation = CompOp.LT;
					item = {
						label: search,
						value: m[2],
						operation,
					};
				}
			} else {
				item = {
					label: "Contains: " + search,
					value: search,
					operation: CompOp.CONTAINS,
				};
			}

			if (item) {
				searchItems.unshift(item);
				const cmpFunc = getCompFunc(item);
				exactItems = exactItems.filter((item) => cmpFunc(item.label));
			}
		}

		if (sort) exactItems = sortOptions(sort, exactItems);

		// "Contains:" and "Regex:" items at the top of the list
		return searchItems.concat(exactItems);
	}, [options, search, filter, sort]);

	React.useEffect(() => {
		if (search === "//" && inputRef.current)
			inputRef.current.setSelectionRange(1, 1);
	}, [search]);

	const isItemSelected = React.useCallback(
		(item: FilterItem) =>
			Boolean(
				filter?.comps.find(
					(comp) =>
						comp.value === item.value &&
						comp.operation === item.operation
				)
			),
		[filter]
	);

	const toggleItemSelected = React.useCallback(
		(item: FilterItem) => {
			setSearch("");
			if (isItemSelected(item))
				dispatch(
					actions.removeFilter({
						dataKey,
						value: item.value,
						operation: item.operation,
					})
				);
			else
				dispatch(
					actions.addFilter({
						dataKey,
						value: item.value,
						operation: item.operation,
					})
				);
		},
		[setSearch, isItemSelected, dispatch, actions, dataKey]
	);

	const onInputKey = React.useCallback(
		(e: React.KeyboardEvent<HTMLInputElement>) => {
			const target = e.target as HTMLInputElement;
			if (e.key === "Enter" && target.value) toggleItemSelected(items[0]);
			if (e.key === "/" && !target.value) {
				// If search is empty and / is pressed, then add // to search
				// and position the cursor between the slashes (through useEffect on search change)
				e.preventDefault();
				setSearch("//");
			}
		},
		[setSearch, toggleItemSelected, items]
	);

	const itemHeight = 35;
	const listHeight = Math.min(items.length * itemHeight, 200);

	return (
		<>
			<Form.Group as={Row} className="mb-3">
				<Form.Label as="span" column className="label">
					Filter:
				</Form.Label>
				<Col className="d-flex gap-2">
					<Button
						variant="outline-secondary"
						onClick={filterSelected}
						disabled={selected.length === 0}
						active={isFilterSelected}
					>
						Selected
					</Button>
					<Button
						variant="outline-secondary"
						onClick={() =>
							dispatch(actions.setFilter({ dataKey, comps: [] }))
						}
						active={filter && filter.comps.length === 0}
					>
						Clear
					</Button>
				</Col>
			</Form.Group>
			{customFilterElement}
			{filter.type === "DATE" && (
				<DateFilter
					dataKey={dataKey}
					selectors={selectors}
					actions={actions}
				/>
			)}
			<Form.Group as={Row}>
				<Form.Label visuallyHidden>Filter search</Form.Label>
				<Form.Control
					id="filter-search"
					type="search"
					value={search}
					ref={inputRef}
					onChange={(e) => setSearch(e.target.value)}
					onKeyDown={onInputKey}
					placeholder="Search..."
				/>
			</Form.Group>

			<List
				className="filter-list"
				height={listHeight}
				itemCount={items.length}
				itemSize={itemHeight}
				width="auto"
			>
				{({ index, style }) => {
					const item = items[index];
					const isSelected = isItemSelected(item);
					return (
						<Item
							key={item.value}
							style={style}
							isSelected={isSelected}
							onClick={() => toggleItemSelected(item)}
						>
							<Form.Check
								id={"select-item-" + index}
								checked={isSelected}
								readOnly
								label={item.label}
							/>
						</Item>
					);
				}}
			</List>
		</>
	);
}

const Header = ({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) => (
	<div
		className={styles["header"] + (className ? " " + className : "")}
		{...props}
	/>
);

type AppTableHeaderCellProps = HeaderCellRendererProps & {
	className?: string;
	style?: React.CSSProperties;
	customFilterElement?: React.ReactNode;
};

function AppTableHeaderCell({
	className,
	style,
	label, // Column label
	dataKey, // Identifies the data element in the row object
	column,
	anchorEl,
	selectors,
	actions,
	customFilterElement, // Custom filter element for dropdown
}: AppTableHeaderCellProps) {
	const [show, setShow] = React.useState(false);
	const sorts = useSelector(selectors.selectSorts);
	const sort = sorts.settings[dataKey];
	const isSorted = sorts.by.includes(dataKey);

	const selectFilter = React.useCallback(
		(state: any) => selectors.selectFilter(state, dataKey),
		[selectors, dataKey]
	);
	const filter = useSelector(selectFilter);
	const isFiltered = filter && filter.comps.length > 0;

	if (!sort && !filter)
		return (
			<Header>
				<span className="label">{label}</span>
			</Header>
		);

	const dropdownToggle = (
		<Dropdown.Toggle
			variant="secondary-outline"
			className="d-flex align-items-center w-100 p-0 text-wrap hasDropdown"
		>
			<span className="label flex-grow-1 text-start fw-bold">
				{label || dataKey}
			</span>
			<div className="handle">
				{isFiltered && (
					<i className="bi-funnel" style={{ opacity: 0.2 }} />
				)}
				{isSorted && (
					<IconSort
						style={{ opacity: 0.2, paddingRight: 4 }}
						direction={sort.direction}
						type={sort.type}
					/>
				)}
			</div>
		</Dropdown.Toggle>
	);

	const dropdownMenu = (
		<Dropdown.Menu className={styles["header-dropdown"]}>
			<Form className="p-3">
				{sort && (
					<SortComponent
						selectors={selectors}
						actions={actions}
						dataKey={dataKey}
					/>
				)}
				{filter && (
					<FilterComponent
						selectors={selectors}
						actions={actions}
						dataKey={dataKey}
						dataRenderer={column.dataRenderer}
						customFilterElement={customFilterElement}
					/>
				)}
			</Form>
		</Dropdown.Menu>
	);

	if (!anchorEl) return null;

	return (
		<Dropdown
			className={className}
			style={style}
			show={show}
			onToggle={setShow}
		>
			{dropdownToggle}
			{ReactDOM.createPortal(dropdownMenu, anchorEl)}
		</Dropdown>
	);
}

export default AppTableHeaderCell;
