import React from "react";

import {
	AppTable,
	ActionButton,
	AppModal,
	ColumnProperties,
} from "dot11-components";

import { useAppSelector } from "../store/hooks";
import { selectIsOnline } from "../store/offline";
import { BallotType, Ballot } from "../store/ballots";
import {
	fields,
	epollsSelectors,
	epollsActions,
	SyncedEpoll,
} from "../store/epolls";

import { BallotAddForm } from "../ballots/BallotDetail";

function ePollToBallot(epoll: SyncedEpoll): Ballot {
	// See if the ePoll name has something like CC53 or LB245
	let type = BallotType.CC,
		number = 0;
	const m = epoll.name.match(/(CC|LB)(\d+)/);
	if (m) {
		type = m[1] === "CC" ? BallotType.CC : BallotType.WG;
		number = Number(m[2]);
	}
	return {
		groupId: null,
		number,
		stage: 0,
		Project: "",
		Type: type,
		EpollNum: epoll.id,
		Start: epoll.start,
		End: epoll.end,
		Document: epoll.document,
		Topic: epoll.topic,
		prev_id: 0,
		IsRecirc: false,
		IsComplete: false,

		id: 0,
		Voters: 0,
		Comments: { Count: 0, CommentIDMax: 0, CommentIDMin: 0 },
		Results: null,
	};
}

const tableColumns: (ColumnProperties & { width: number })[] = [
	{ key: "id", ...fields.id, width: 100 },
	{ key: "name", ...fields.name, width: 200 },
	{ key: "start", ...fields.start, width: 100 },
	{ key: "end", ...fields.end, width: 100 },
	{ key: "document", ...fields.document, width: 200 },
	{ key: "topic", ...fields.topic, width: 500 },
	{ key: "resultsSummary", ...fields.resultsSummary, width: 100 },
	{ key: "actions", label: "", width: 200, headerRenderer: () => "" },
];

function EpollsTable() {
	const isOnline = useAppSelector(selectIsOnline);
	const [addBallot, setAddBallot] = React.useState<Ballot | null>(null);

	const columns = React.useMemo(() => {
		const columns = tableColumns.slice();
		const cellRenderer = ({ rowData }: { rowData: SyncedEpoll }) =>
			rowData.InDatabase ? (
				<span>Already Present</span>
			) : (
				<ActionButton
					name="add"
					title="Add ballot"
					onClick={() => setAddBallot(ePollToBallot(rowData))}
					disabled={!isOnline}
				/>
			);
		columns[columns.length - 1] = {
			...columns[columns.length - 1],
			cellRenderer,
		};
		return columns;
	}, [setAddBallot, isOnline]);

	return (
		<>
			<div className="table-container" style={{ alignItems: "unset" }}>
				<AppTable
					columns={columns}
					headerHeight={28}
					estimatedRowHeight={64}
					selectors={epollsSelectors}
					actions={epollsActions}
				/>
			</div>
			<AppModal
				isOpen={addBallot !== null}
				onRequestClose={() => setAddBallot(null)}
			>
				{addBallot && (
					<BallotAddForm
						defaultBallot={addBallot}
						close={() => setAddBallot(null)}
					/>
				)}
			</AppModal>
		</>
	);
}

export default EpollsTable;
