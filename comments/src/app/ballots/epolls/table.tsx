import React from "react";
import { Modal, Button } from "react-bootstrap";
import { AppTable } from "@common";

import { useAppSelector } from "@/store/hooks";
import { selectIsOnline } from "@/store/offline";
import { BallotType, Ballot } from "@/store/ballots";
import { epollsSelectors, epollsActions, SyncedEpoll } from "@/store/epolls";

import { tableColumns, defaultTablesConfig } from "./tableColumns";
import { BallotAddForm } from "../BallotAddForm";

function ePollToBallot(epoll: SyncedEpoll): Ballot {
	// See if the ePoll name has something like CC53 or LB245
	let type = BallotType.CC,
		number = 0;
	const m = epoll.name.match(/(CC|LB)(\d+)/);
	if (m) {
		type = m[1] === "CC" ? BallotType.CC : BallotType.WG;
		number = Number(m[2]);
	}
	const ballot: Ballot = {
		groupId: "",
		number,
		stage: 0,
		Project: "",
		Type: type,
		EpollNum: epoll.id,
		Start: epoll.start,
		End: epoll.end,
		Document: epoll.document,
		Topic: epoll.topic,
		prev_id: null,
		IsComplete: false,

		id: 0,
		Voters: 0,
		Comments: { Count: 0, CommentIDMax: 0, CommentIDMin: 0 },
		Results: null,
		workingGroupId: "",
		BallotID: "",
	};
	return ballot;
}

function EpollsTable() {
	const isOnline = useAppSelector(selectIsOnline);
	const [addBallot, setAddBallot] = React.useState<Ballot | null>(null);

	const columns = React.useMemo(() => {
		const columns = tableColumns.slice();
		const cellRenderer = ({ rowData }: { rowData: SyncedEpoll }) =>
			rowData.InDatabase ? (
				<span>Already Present</span>
			) : (
				<Button
					variant="outline-secondary"
					className="bi-plus-lg"
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
					defaultTablesConfig={defaultTablesConfig}
				/>
			</div>
			<Modal show={addBallot !== null} onHide={() => setAddBallot(null)}>
				{addBallot && (
					<BallotAddForm
						defaultBallot={addBallot}
						close={() => setAddBallot(null)}
						setBusy={() => {}}
					/>
				)}
			</Modal>
		</>
	);
}

export default EpollsTable;
