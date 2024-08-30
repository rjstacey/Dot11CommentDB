import {
	AppTable,
	SelectHeaderCell,
	SelectCell,
	ColumnProperties,
} from "dot11-components";

import {
	imatMeetingAttendanceSelectors,
	imatMeetingAttendanceActions,
} from "../store/imatMeetingAttendance";

type ColumnPropertiesWithWidth = ColumnProperties & { width: number };

const columns: ColumnPropertiesWithWidth[] = [
	{
		key: "__ctrl__",
		width: 30,
		flexGrow: 1,
		flexShrink: 0,
		headerRenderer: (p) => <SelectHeaderCell {...p} />,
		cellRenderer: (p) => (
			<SelectCell
				selectors={imatMeetingAttendanceSelectors}
				actions={imatMeetingAttendanceActions}
				{...p}
			/>
		),
	},
	{
		key: "breakoutId",
		label: "Breakout",
		width: 150,
		flexGrow: 1,
		flexShrink: 1,
	},
	{ key: "SAPIN", label: "SA PIN", width: 150, flexGrow: 1, flexShrink: 1 },
	{ key: "Name", label: "Name", width: 300, flexGrow: 1, flexShrink: 1 },
	{
		key: "Affiliation",
		label: "Affiliation",
		width: 300,
		flexGrow: 1,
		flexShrink: 1,
	},
	{ key: "Email", label: "Email", width: 300, flexGrow: 1, flexShrink: 1 },
	{
		key: "Timestamp",
		label: "Timestamp",
		width: 150,
		flexGrow: 1,
		flexShrink: 1,
	},
];

function BreakoutAttendance() {
	return (
		<div className="table-container centered-rows">
			<AppTable
				fitWidth
				fixed
				columns={columns}
				headerHeight={36}
				estimatedRowHeight={36}
				selectors={imatMeetingAttendanceSelectors}
				actions={imatMeetingAttendanceActions}
			/>
		</div>
	);
}

export default BreakoutAttendance;
