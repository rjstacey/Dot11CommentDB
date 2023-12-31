import { Link, useLocation, useParams } from "react-router-dom";

import {
	AppTable,
	SelectHeaderCell,
	SelectCell,
	TableColumnHeader,
	ActionButton,
	HeaderCellRendererProps,
	ColumnProperties,
} from "dot11-components";

import TopRow from "../components/TopRow";

import { useAppDispatch } from "../store/hooks";
import {
	loadImatMeetings,
	fields,
	imatMeetingsSelectors,
	imatMeetingsActions,
	clearImatMeetings,
} from "../store/imatMeetings";

import styles from "./imat.module.css";

const renderDateRangeHeader = (props: HeaderCellRendererProps) => (
	<>
		<TableColumnHeader {...props} dataKey="start" label="Start date" />
		<TableColumnHeader {...props} dataKey="end" label="End date" />
	</>
);

const BreakoutsLink = ({ imatMeetingId }: { imatMeetingId: number }) => {
	const location = useLocation();
	const path =
		location.pathname.replace("imatMeetings", "imatBreakouts") +
		`/${imatMeetingId}`;
	return <Link to={path}>view breakouts</Link>;
};

type ColumnPropertiesWithWidth = ColumnProperties & { width: number };

const tableColumns: ColumnPropertiesWithWidth[] = [
	{
		key: "__ctrl__",
		width: 30,
		flexGrow: 1,
		flexShrink: 0,
		headerRenderer: (p) => <SelectHeaderCell {...p} />,
		cellRenderer: (p) => (
			<SelectCell
				selectors={imatMeetingsSelectors}
				actions={imatMeetingsActions}
				{...p}
			/>
		),
	},
	{
		key: "dateRange",
		...fields.dateRange,
		width: 200,
		flexGrow: 1,
		flexShrink: 1,
		headerRenderer: renderDateRangeHeader,
	},
	{
		key: "name",
		...fields.name,
		width: 400,
		flexGrow: 1,
		flexShrink: 1,
		dropdownWidth: 300,
	},
	{ key: "type", ...fields.type, width: 100, flexGrow: 1, flexShrink: 1 },
	{
		key: "timezone",
		...fields.timezone,
		width: 200,
		flexGrow: 1,
		flexShrink: 1,
	},
	{
		key: "sessionId",
		...fields.sessionId,
		width: 100,
		flexGrow: 1,
		flexShrink: 1,
	},
	{
		key: "breakouts",
		label: "Breakouts",
		width: 100,
		flexGrow: 1,
		flexShrink: 1,
		cellRenderer: ({ rowData }) => (
			<BreakoutsLink imatMeetingId={rowData.id} />
		),
	},
];

const maxWidth = tableColumns.reduce((acc, col) => acc + col.width, 0);

function ImatMeetings() {
	const dispatch = useAppDispatch();
	const { groupName } = useParams();

	const refresh = () =>
		dispatch(groupName ? loadImatMeetings(groupName) : clearImatMeetings());

	return (
		<>
			<TopRow style={{ maxWidth }}>
				<div>IMAT Sessions</div>
				<ActionButton
					name="refresh"
					title="Refresh"
					onClick={refresh}
				/>
			</TopRow>

			<div className={styles["table-container"]} style={{ maxWidth }}>
				<AppTable
					fixed
					columns={tableColumns}
					headerHeight={46}
					estimatedRowHeight={36}
					selectors={imatMeetingsSelectors}
					actions={imatMeetingsActions}
				/>
			</div>
		</>
	);
}

export default ImatMeetings;
