import {
	AppTable,
	SelectHeaderCell,
	SelectCell,
	ColumnProperties,
} from "@common";

import {
	imatBreakoutAttendanceSelectors,
	imatBreakoutAttendanceActions,
} from "@/store/imatBreakoutAttendance";

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
				selectors={imatBreakoutAttendanceSelectors}
				actions={imatBreakoutAttendanceActions}
				{...p}
			/>
		),
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

export function ImatBreakoutAttendance() {
	return (
		<div className="table-container centered-rows">
			<AppTable
				fitWidth
				fixed
				columns={columns}
				headerHeight={36}
				estimatedRowHeight={36}
				selectors={imatBreakoutAttendanceSelectors}
				actions={imatBreakoutAttendanceActions}
			/>
		</div>
	);
}
