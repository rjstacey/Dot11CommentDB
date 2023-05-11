import React from 'react';
import { useNavigate } from 'react-router-dom';
import styled from '@emotion/styled';

import {
	AppTable,
	ActionButton,
	AppModal,
	ColumnProperties
} from 'dot11-components';

import { useAppDispatch, useAppSelector } from '../store/hooks';
import { loadBallots, BallotType, selectBallotsState, BallotCreate } from '../store/ballots';
import { fields, loadEpolls, selectEpollsState, epollsSelectors, epollsActions, SyncedEpoll } from '../store/epolls';

import { BallotAddForm } from './BallotDetail';

// The action row height is determined by its content
const ActionRow = styled.div`
	display: flex;
	justify-content: space-between;
	width: 100%;
`;

// The table row grows to the available height
const TableRow = styled.div`
	flex: 1;
	width: 100%;
`;

function ePollToBallot(epoll: SyncedEpoll): BallotCreate {
	// See if the ePoll name has something like CC53 or LB245
	const m = epoll.name.match(/(CC|LB)\d+/)
	let type = BallotType.Motion,
		ballotId = '';
	if (m) {
		ballotId = m[0];
		type = ballotId.startsWith('CC')? BallotType.CC: BallotType.WG;
	}
	return {
		Project: '',
		BallotID: ballotId,
		Type: type,
		EpollNum: epoll.id,
		Start: epoll.start,
		End: epoll.end,
		Document: epoll.document,
		Topic: epoll.topic,
		VotingPoolID: '',
		prev_id: 0,
		IsRecirc: false,
		IsComplete: false,
	}
}

const tableColumns: (ColumnProperties & {width: number})[] = [
		{key: 'id', 			...fields.id, 			width: 100},
		{key: 'name', 			...fields.name,			width: 200},
		{key: 'start', 			...fields.start,		width: 100},
		{key: 'end', 			...fields.end,			width: 100},
		{key: 'document', 		...fields.document,		width: 200},
		{key: 'topic', 			...fields.topic,		width: 500},
		{key: 'resultsSummary',	...fields.resultsSummary, width: 100},
		{key: 'actions', label: '',	width: 200,
			headerRenderer: () => ''}
	];

const maxWidth = tableColumns.reduce((acc, col) => acc + col.width, 0) + 40

function Epolls() {

	const navigate = useNavigate();

	const {valid: ballotsValid, loading: ballotsLoading} = useAppSelector(selectBallotsState);
	const {valid, loading} = useAppSelector(selectEpollsState);

	const dispatch = useAppDispatch();

	const numberEpolls = React.useRef(20);
	const load = React.useCallback(() => dispatch(loadEpolls(numberEpolls.current)), [dispatch]);

	const [hasMounted, setHasMounted] = React.useState(false);

	React.useEffect(() => {
		if (hasMounted)
			return;
		if (!ballotsValid && !ballotsLoading)
			dispatch(loadBallots());
		if (!valid && !loading)
			load();
		setHasMounted(true);
	}, [dispatch, load, setHasMounted, hasMounted, ballotsValid, ballotsLoading, valid, loading]);

	const close = () => navigate('/ballots');

	function loadMore() {
		numberEpolls.current += 10;
		load();
	}

	const [addBallot, setAddBallot] = React.useState<BallotCreate | null>(null);

	const columns = React.useMemo(() => {
		const columns = tableColumns.slice();
		const cellRenderer = ({rowData}: {rowData: SyncedEpoll}) => rowData.InDatabase?
			<span>Already Present</span>:
			<ActionButton
				name='add'
				title='Add ballot' 
				onClick={() => setAddBallot(ePollToBallot(rowData))}
			/>
		columns[columns.length-1] = {
			...columns[columns.length-1],
			cellRenderer
		};
		return columns;
	}, [setAddBallot]);

	return (
		<>
			<ActionRow style={{maxWidth}}>
				<span><label>Closed ePolls</label></span>
				<span>
					<ActionButton name='more' title='Load More' onClick={loadMore} />
					<ActionButton name='refresh' title='Refresh' onClick={load} />
					<ActionButton name='close' title='Close' onClick={close} />
				</span>
			</ActionRow>
			<TableRow style={{maxWidth}}>
				<AppTable
					columns={columns}
					headerHeight={28}
					estimatedRowHeight={64}
					selectors={epollsSelectors}
					actions={epollsActions}
				/>
			</TableRow>
			<AppModal
				isOpen={addBallot !== null}
				onRequestClose={() => setAddBallot(null)}
			>
				<BallotAddForm
					defaultBallot={addBallot || undefined}
					methods={{close: () => setAddBallot(null)}}
				/>
			</AppModal>
		</>
	)
}

export default Epolls;
