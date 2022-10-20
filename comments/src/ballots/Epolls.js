import React from 'react';
import {useHistory} from 'react-router-dom';
import {useDispatch, useSelector} from 'react-redux';
import styled from '@emotion/styled';

import AppTable from 'dot11-components/table';
import {ActionButton} from 'dot11-components/form';
import {AppModal} from 'dot11-components/modals';

import {loadBallots, BallotType, selectBallotsState} from '../store/ballots';
import {fields, loadEpolls, selectEpollsState, dataSet} from '../store/epolls';

import {BallotAddForm} from './BallotDetail';

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

function ePollToBallot(epoll) {
	// See if the ePoll name has something like CC53 or LB245
	const m = epoll.BallotID.match(/(CC|LB)\d+/)
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
		EpollNum: epoll.EpollNum,
		Start: epoll.Start,
		End: epoll.End,
		Document: epoll.Document,
		Topic: epoll.Topic,
		VotingPoolID: '',
		PrevBallotID: '',
		IsRecirc: 0,
		IsComplete: 0,
	}
}

const tableColumns = [
		{key: 'EpollNum', 	...fields.EpollNum, 	width: 100},
		{key: 'BallotID', 	...fields.BallotID,		width: 200},
		{key: 'Start', 		...fields.Start,		width: 100},
		{key: 'End', 		...fields.End,			width: 100},
		{key: 'Document', 	...fields.Document,		width: 200},
		{key: 'Topic', 		...fields.Topic,		width: 500},
		{key: 'Votes',		...fields.Votes,		width: 100},
		{key: 'Actions', 	label: '',				width: 200,
			headerRenderer: () => ''}
	];

const maxWidth = tableColumns.reduce((acc, col) => acc + col.width, 0) + 40

function Epolls() {

	const history = useHistory();

	const {valid: ballotsValid, loading: ballotsLoading} = useSelector(selectBallotsState);
	const {valid, loading} = useSelector(selectEpollsState);

	const dispatch = useDispatch();

	const numberEpolls = React.useRef(20);
	const load = React.useCallback(() => dispatch(loadEpolls(numberEpolls.current)), [dispatch]);

	const [hasMounted, setHasMounted] = React.useState(false);

	React.useEffect(() => {
		if (hasMounted)
			return;
		if (!ballotsValid && !ballotsLoading)
			dispatch(loadBallots());
		if (!valid && !loading)
			load(numberEpolls.current);
		setHasMounted(true);
	}, [dispatch, load, setHasMounted, hasMounted, ballotsValid, ballotsLoading, valid, loading]);

	const close = () => history.push('/ballots');

	function loadMore() {
		numberEpolls.current += 10;
		load();
	}

	const [addBallot, setAddBallot] = React.useState(null);

	const columns = React.useMemo(() => {
		const columns = tableColumns.slice();
		const cellRenderer = ({rowData}) => rowData.InDatabase?
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
					dataSet={dataSet}
				/>
			</TableRow>
			<AppModal
				isOpen={addBallot !== null}
				onRequestClose={() => setAddBallot(null)}
			>
				<BallotAddForm
					defaultBallot={addBallot}
					methods={{close: () => setAddBallot(null)}}
				/>
			</AppModal>
		</>
	)
}

export default React.memo(Epolls);
