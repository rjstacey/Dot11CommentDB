import { useNavigate, useParams } from "react-router-dom";

import {
	AppTable,
	SelectHeaderCell,
	SelectCell,
	ActionButton,
	displayDayDate,
	displayTime,
	ColumnProperties,
} from "dot11-components";

import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
	loadBreakoutAttendance,
	selectImatMeeting,
	selectImatBreakout,
	imatBreakoutAttendanceSelectors,
	imatBreakoutAttendanceActions,
	clearBreakoutAttendance,
} from "../store/imatBreakoutAttendance";
import type { Breakout } from "../store/imatBreakouts";

import { ImatMeetingInfo } from "./ImatBreakouts";

function ImatBreakoutInfo({ breakout }: { breakout?: Breakout }) {
	let content = breakout ? (
		<>
			<span>{breakout.name}</span>
			<span>{displayDayDate(breakout.start)}</span>
			<span>
				{displayTime(breakout.start) +
					" - " +
					displayTime(breakout.end)}
			</span>
			<span>{breakout.location}</span>
		</>
	) : null;

	return (
		<div style={{ display: "flex", flexDirection: "column" }}>
			{content}
		</div>
	);
}

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

const maxWidth = columns.reduce((acc, col) => acc + col.width, 0);

function BreakoutAttendance() {
	const dispatch = useAppDispatch();
	const navigate = useNavigate();
	const params = useParams();
	const { groupName } = params;
	const meetingNumber = Number(params.meetingNumber);
	const breakoutNumber = Number(params.breakoutNumber);

	const imatMeeting = useAppSelector(selectImatMeeting);
	const breakout = useAppSelector(selectImatBreakout);

	const close = () => navigate(-1);
	const refresh = () =>
		dispatch(
			groupName && meetingNumber && breakoutNumber
				? loadBreakoutAttendance(
						groupName,
						meetingNumber,
						breakoutNumber
				  )
				: clearBreakoutAttendance()
		);

	return (
		<>
			<div className="top-row" style={{ maxWidth }}>
				<ImatMeetingInfo imatMeeting={imatMeeting} />
				<ImatBreakoutInfo breakout={breakout} />
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
					selectors={imatBreakoutAttendanceSelectors}
					actions={imatBreakoutAttendanceActions}
				/>
			</div>
		</>
	);
}

export default BreakoutAttendance;
