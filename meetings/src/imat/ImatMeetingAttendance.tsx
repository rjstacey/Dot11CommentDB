import { useNavigate, useParams } from "react-router-dom";

import {
	AppTable,
	SelectHeaderCell,
	SelectCell,
	ActionButton,
	ColumnProperties,
} from "dot11-components";

import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
	loadImatMeetingAttendance,
	clearImatMeetingAttendance,
	selectImatMeeting,
	imatMeetingAttendanceSelectors,
	imatMeetingAttendanceActions,
} from "../store/imatMeetingAttendance";

import { ImatMeetingInfo } from "./ImatBreakouts";

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

const maxWidth = columns.reduce((acc, col) => acc + col.width, 0);

function BreakoutAttendance() {
	const dispatch = useAppDispatch();
	const navigate = useNavigate();
	const params = useParams();
	const { groupName } = params;
	const meetingNumber = Number(params.meetingNumber);

	const imatMeeting = useAppSelector(selectImatMeeting);
	const close = () => navigate(-1);
	const refresh = () =>
		dispatch(
			groupName && meetingNumber
				? loadImatMeetingAttendance(groupName, meetingNumber)
				: clearImatMeetingAttendance()
		);

	return (
		<>
			<div className="top-row" style={{ maxWidth }}>
				<ImatMeetingInfo imatMeeting={imatMeeting} />
				<div>
					<ActionButton
						name="refresh"
						title="Refresh"
						onClick={refresh}
					/>
					<ActionButton name="close" title="Close" onClick={close} />
				</div>
			</div>

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
		</>
	);
}

export default BreakoutAttendance;
