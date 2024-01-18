import * as React from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
	AppTable,
	ActionButton,
	AppModal,
	Spinner,
	ColumnProperties,
} from "dot11-components";

import { useAppDispatch, useAppSelector } from "../store/hooks";
import { selectIsOnline } from "../store/offline";
import { BallotType, Ballot } from "../store/ballots";
import {
	fields,
	loadEpolls,
	selectEpollsState,
	epollsSelectors,
	epollsActions,
	SyncedEpoll,
} from "../store/epolls";

import { BallotAddForm } from "./BallotDetail";

function ePollToBallot(epoll: SyncedEpoll): Ballot {
	// See if the ePoll name has something like CC53 or LB245
	const m = epoll.name.match(/(CC|LB)\d+/);
	let type = BallotType.Motion,
		ballotId = "";
	if (m) {
		ballotId = m[0];
		type = ballotId.startsWith("CC") ? BallotType.CC : BallotType.WG;
	}
	return {
		groupId: null,
		Project: "",
		BallotID: ballotId,
		Type: type,
		EpollNum: epoll.id,
		Start: epoll.start,
		End: epoll.end,
		Document: epoll.document,
		Topic: epoll.topic,
		VotingPoolID: "",
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

const maxWidth = tableColumns.reduce((acc, col) => acc + col.width, 0) + 40;

function Epolls() {
	const navigate = useNavigate();
	const dispatch = useAppDispatch();
	const { groupName } = useParams();
	const { loading } = useAppSelector(selectEpollsState);
	const isOnline = useAppSelector(selectIsOnline);

	const numberEpolls = React.useRef(20);
	const load = React.useCallback(
		() =>
			groupName && dispatch(loadEpolls(groupName, numberEpolls.current)),
		[dispatch, groupName]
	);

	const close = () => navigate(`/${groupName}/ballots`);

	function loadMore() {
		numberEpolls.current += 10;
		load();
	}

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
			<div className="top-row" style={{ maxWidth }}>
				<span>
					<label>Closed ePolls</label>
				</span>
				{loading && <Spinner />}
				<span>
					<ActionButton
						name="more"
						title="Load More"
						onClick={loadMore}
						disabled={loading || !isOnline}
					/>
					<ActionButton
						name="refresh"
						title="Refresh"
						onClick={load}
						disabled={loading || !isOnline}
					/>
					<ActionButton
						name="close"
						title="Close"
						onClick={close}
					/>
				</span>
			</div>
			<div className="table-container" style={{ maxWidth }}>
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
				<BallotAddForm
					defaultBallot={addBallot || undefined}
					close={() => setAddBallot(null)}
				/>
			</AppModal>
		</>
	);
}

export default Epolls;
