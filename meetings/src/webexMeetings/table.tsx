import * as React from "react";
import { DateTime } from "luxon";

import {
	AppTable,
	SelectHeaderCell,
	SelectCell,
	TableColumnHeader,
	SplitPanel,
	Panel,
	Form,
	AppModal,
	HeaderCellRendererProps,
	ColumnProperties,
	TablesConfig,
	TableConfig,
	RowGetterProps,
	deepMerge,
} from "dot11-components";

import { useAppDispatch, useAppSelector } from "../store/hooks";
import { selectGroupEntities, selectTopLevelGroupId } from "../store/groups";
import { updateMeetings, addMeetings } from "../store/meetings";
import {
	fields,
	getField,
	webexMeetingsSelectors,
	webexMeetingsActions,
	displayMeetingNumber,
	SyncedWebexMeeting,
} from "../store/webexMeetings";

import MeetingSelector from "../components/MeetingSelector";
import MeetingSummary from "../components/MeetingSummary";

import WebexMeetingDetail from "./WebexMeetingDetail";
import {
	MeetingEntry,
	MultipleMeetingEntry,
	convertEntryToMeeting,
} from "../meetings/MeetingDetails";
import MeetingEntryForm from "../meetings/MeetingEntry";

function MeetingLink({
	webexMeeting,
	close,
}: {
	webexMeeting: SyncedWebexMeeting;
	close: () => void;
}) {
	const dispatch = useAppDispatch();
	const [id, setId] = React.useState<number | null>(null);

	function submit() {
		if (id)
			dispatch(
				updateMeetings([
					{
						id,
						changes: {
							webexAccountId: webexMeeting.accountId,
							webexMeetingId: webexMeeting.id,
						},
					},
				])
			);
	}

	return (
		<Form submit={submit} cancel={close}>
			<MeetingSelector value={id} onChange={setId} />
		</Form>
	);
}

const toTimeStr = (hour: number, min: number) =>
	("" + hour).padStart(2, "0") + ":" + ("" + min).padStart(2, "0");

function MeetingAdd({
	webexMeeting,
	close,
}: {
	webexMeeting: SyncedWebexMeeting;
	close: () => void;
}) {
	const dispatch = useAppDispatch();
	const groupEntities = useAppSelector(selectGroupEntities);
	const groupId = useAppSelector(selectTopLevelGroupId)!;
	const [entry, setEntry] = React.useState<MeetingEntry>(initState);

	function initState(): MeetingEntry {
		const start = DateTime.fromISO(webexMeeting.start, {
			zone: webexMeeting.timezone,
		});
		const end = DateTime.fromISO(webexMeeting.end, {
			zone: webexMeeting.timezone,
		});
		const date = start.toISODate()!;
		const startTime = toTimeStr(start.hour, start.minute);
		const endTime = toTimeStr(end.hour, end.minute);
		const duration = end.diff(start, "hours").hours.toString();

		let subgroupId = groupId;
		const parentGroup = groupEntities[groupId];
		if (parentGroup) {
			const m = webexMeeting.title.match(`${parentGroup.name} (.*)`);
			if (m) {
				for (const id in groupEntities) {
					const group = groupEntities[id]!;
					if (group.name === m[1]) subgroupId = group.id;
				}
			}
		}

		return {
			webexMeeting,
			summary: webexMeeting.title,
			timezone: webexMeeting.timezone,
			date,
			startTime,
			endTime,
			duration,
			organizationId: subgroupId,
			webexAccountId: webexMeeting.accountId,
			webexMeetingId: webexMeeting.id,
			sessionId: 0, //null, --- need to fix
			imatMeetingId: null,
			imatBreakoutId: null,
			location: "",
			roomId: null,
			hasMotions: false,
			isCancelled: false,
			calendarAccountId: null,
			calendarEventId: null,
			startSlotId: null,
		};
	}

	function add() {
		const meeting = convertEntryToMeeting(entry);
		dispatch(addMeetings([meeting]));
		close();
	}

	return (
		<MeetingEntryForm
			entry={entry as MultipleMeetingEntry}
			changeEntry={(changes) =>
				setEntry((state) => deepMerge(state, changes))
			}
			action="add-by-date"
			submit={add}
			cancel={close}
		/>
	);
}

function WebexMeetingHeading(props: HeaderCellRendererProps) {
	return (
		<>
			<TableColumnHeader
				{...props}
				label="Webex account"
				dataKey="accountName"
			/>
			<TableColumnHeader
				{...props}
				label="Meeting number"
				dataKey="meetingNumber"
			/>
		</>
	);
}

function renderWebexMeeting({ rowData }: { rowData: SyncedWebexMeeting }) {
	const { accountName, meetingNumber } = rowData;
	return `${accountName}: ${displayMeetingNumber(meetingNumber)}`;
}

export const tableColumns: ColumnProperties[] = [
	{
		key: "__ctrl__",
		width: 30,
		flexGrow: 0,
		flexShrink: 0,
		headerRenderer: (p) => <SelectHeaderCell {...p} />,
		cellRenderer: (p) => (
			<SelectCell
				selectors={webexMeetingsSelectors}
				actions={webexMeetingsActions}
				{...p}
			/>
		),
	},
	{
		key: "dayDate",
		...fields.dayDate,
		width: 100,
		flexGrow: 1,
		flexShrink: 1,
	},
	{
		key: "timeRange",
		...fields.timeRange,
		width: 70,
		flexGrow: 1,
		flexShrink: 1,
	},
	{
		key: "webexMeeting",
		label: "Meeting",
		width: 200,
		flexGrow: 1,
		flexShrink: 1,
		headerRenderer: (p) => <WebexMeetingHeading {...p} />,
		cellRenderer: renderWebexMeeting,
	},
	{
		key: "accountName",
		...fields.accountName,
		width: 150,
		flexGrow: 1,
		flexShrink: 1,
	},
	{
		key: "meetingNumber",
		...fields.meetingNumber,
		width: 200,
		flexGrow: 1,
		flexShrink: 1,
	},
	{
		key: "hostKey",
		...fields.hostKey,
		width: 100,
		flexGrow: 1,
		flexShrink: 1,
	},
	{
		key: "title",
		...fields.title,
		width: 200,
		flexGrow: 1,
		flexShrink: 1,
		dropdownWidth: 300,
	},
	{
		key: "timezone",
		...fields.timezone,
		width: 200,
		flexGrow: 1,
		flexShrink: 1,
	},
	{
		key: "meeting",
		label: "Associated meeting",
		width: 100,
		flexGrow: 1,
		flexShrink: 1,
		cellRenderer: ({ rowData }) => (
			<MeetingSummary meetingId={rowData.meetingId} />
		),
	},
];

const defaultTablesColumns = {
	default: [
		"__ctrl__",
		"dayDate",
		"timeRange",
		"webexMeeting",
		"title",
		"meeting",
	],
};

let defaultTablesConfig: TablesConfig = {};
let tableView: keyof typeof defaultTablesColumns;
for (tableView in defaultTablesColumns) {
	const tableConfig: TableConfig = {
		fixed: false,
		columns: {},
	};
	for (const column of tableColumns) {
		const key = column.key;
		tableConfig.columns[key] = {
			unselectable: key.startsWith("__"),
			shown: defaultTablesColumns[tableView].includes(key),
			width: column.width || 200,
		};
	}
	defaultTablesConfig[tableView] = tableConfig;
}

/*
 * Don't display date and time if it is the same as previous line
 */
function webexMeetingsRowGetter({
	rowIndex,
	ids,
	entities,
}: RowGetterProps<SyncedWebexMeeting>) {
	let webexMeeting = entities[ids[rowIndex]]!;
	let b = {
		...webexMeeting,
		dayDate: getField(webexMeeting, "dayDate"),
		timeRange: getField(webexMeeting, "timeRange"),
	};
	if (rowIndex > 0) {
		let b_prev = entities[ids[rowIndex - 1]]!;
		if (b.dayDate === getField(b_prev, "dayDate")) {
			b = { ...b, dayDate: "" };
			if (b.timeRange === getField(b_prev, "timeRange"))
				b = { ...b, timeRange: "" };
		}
	}
	return b;
}

function WebexMeetings() {
	const [webexMeetingToLink, setWebexMeetingToLink] =
		React.useState<SyncedWebexMeeting | null>(null);
	const [webexMeetingToAdd, setWebexMeetingToAdd] =
		React.useState<SyncedWebexMeeting | null>(null);

	const closeToLink = () => setWebexMeetingToLink(null);
	const closeToAdd = () => setWebexMeetingToAdd(null);

	return (
		<>
			<SplitPanel
				selectors={webexMeetingsSelectors}
				actions={webexMeetingsActions}
			>
				<Panel>
					<AppTable
						defaultTablesConfig={defaultTablesConfig}
						columns={tableColumns}
						headerHeight={46}
						estimatedRowHeight={36}
						rowGetter={webexMeetingsRowGetter}
						selectors={webexMeetingsSelectors}
						actions={webexMeetingsActions}
					/>
				</Panel>
				<Panel className="details-panel">
					<WebexMeetingDetail />
				</Panel>
			</SplitPanel>

			<AppModal
				isOpen={!!webexMeetingToLink}
				onRequestClose={closeToLink}
			>
				<MeetingLink
					webexMeeting={webexMeetingToLink!}
					close={closeToLink}
				/>
			</AppModal>

			<AppModal isOpen={!!webexMeetingToAdd} onRequestClose={closeToAdd}>
				<MeetingAdd
					webexMeeting={webexMeetingToAdd!}
					close={closeToAdd}
				/>
			</AppModal>
		</>
	);
}

export default WebexMeetings;
