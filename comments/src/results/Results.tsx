import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import styled from '@emotion/styled';

import {
	AppTable, TableColumnSelector,
	ActionButton,
	ColumnProperties,
	TablesConfig,
} from 'dot11-components';

import TopRow from '../components/TopRow';
import BallotSelector from '../components/BallotSelector';
import ResultsSummary from './ResultsSummary';
import ResultsExport from './ResultsExport';

import { useAppDispatch, useAppSelector } from '../store/hooks';
import { selectUserAccessLevel, AccessLevel } from '../store/user';
import { loadResults, clearResults, selectResultsState, resultsSelectors, resultsActions, upsertTableColumns } from '../store/results';
import { setBallotId, selectBallotsState, getCurrentBallot, BallotType } from '../store/ballots';

// The table row grows to the available height
const TableRow = styled.div`
	flex: 1;
	overflow: hidden; /* prevent content increasing height */
	width: 100%;
	.AppTable__dataRow,
	.AppTable__headerRow {
		align-items: center;
	}
`;

const NoWrapItem = styled.div`
	text-overflow: ellipsis;
	white-space: nowrap;
	overflow: hidden;
`;

const renderItem = ({rowData, dataKey}) => <NoWrapItem>{rowData[dataKey]}</NoWrapItem>

const tableColumns: ColumnProperties[] = [
	{key: 'SAPIN',			label: 'SA PIN',		width: 75},
	{key: 'Name', 			label: 'Name',			width: 200, cellRenderer: renderItem},
	{key: 'Affiliation',	label: 'Affiliation',	width: 200, cellRenderer: renderItem},
	{key: 'Email', 			label: 'Email',			width: 250, cellRenderer: renderItem},
	{key: 'Vote', 			label: 'Vote',			width: 210},
	{key: 'CommentCount', 	label: 'Comments',		width: 110},
	{key: 'Notes', 			label: 'Notes',			width: 250,	flexShrink: 1, flexGrow: 1}
];

function getDefaultTablesConfig(access: number, type: number): TablesConfig {
	const columns = tableColumns.reduce((o, c) => {
			const columnConfig = {
				shown: true,
				width: c.width,
				unselectable: false
			};
			if (c.key === 'SAPIN') {
				if (access < AccessLevel.admin) {
					columnConfig.shown = false;
					columnConfig.unselectable = true;
				}
				if (type === BallotType.SA) {
					columnConfig.shown = false;
					columnConfig.unselectable = true;
				}
			}
			if (c.key === 'Email') {
				if (access < AccessLevel.admin) {
					columnConfig.shown = false;
					columnConfig.unselectable = true;
				}
			}
			o[c.key] = columnConfig;
			return o;
		}, {});
	return {default: {fixed: false, columns}};
}

function updateTableConfigAction(access: number, type: number) {
	if (access < AccessLevel.admin)
		return upsertTableColumns({columns: {SAPIN: {shown: false}, Email: {shown: false}}});

	if (type === BallotType.SA)
		return upsertTableColumns({columns: {SAPIN: {shown: false}, Email: {shown: true}}});

	return upsertTableColumns({columns: {SAPIN: {shown: true}, Email: {shown: true}}});
}

const maxWidth = 1600;

function Results() {

	const navigate = useNavigate();
	const {ballotId} = useParams();

	const access = useAppSelector(selectUserAccessLevel);
	const {loading, ballot_id: resultsBallot_id} = useAppSelector(selectResultsState);
	const {entities: ballotEntities} = useAppSelector(selectBallotsState);
	const currentBallot = useAppSelector(getCurrentBallot);
	
	const dispatch = useAppDispatch();

	const defaultTablesConfig = React.useMemo(() => {
		if (currentBallot)
			return getDefaultTablesConfig(access, currentBallot.Type);
	}, [access, currentBallot]);

	React.useEffect(() => {
		if (currentBallot)
			dispatch(updateTableConfigAction(access, currentBallot.Type));
	}, [dispatch, access, currentBallot]);

	React.useEffect(() => {
		if (ballotId) {
			if (!currentBallot || ballotId !== currentBallot.BallotID) {
				// Routed here with parameter ballotId specified, but not matching stored currentId; set the current ballot
				dispatch(setBallotId(ballotId));
			}
		}
		else if (currentBallot) {
			// Routed here with parameter ballotId unspecified, but current ballot has previously been selected; re-route to current ballot
			navigate(`/results/${currentBallot.BallotID}`);
		}
	}, [dispatch, navigate, ballotId, currentBallot]);

	React.useEffect(() => {
		if (!loading && currentBallot && resultsBallot_id !== currentBallot.id)
			dispatch(loadResults(currentBallot.id));
	}, [dispatch, loading, currentBallot, resultsBallot_id]);

	const onBallotSelected = (ballot_id: number) => {
		const ballot = ballotEntities[ballot_id];
		if (ballot)
			navigate(`/results/${ballot.BallotID}`); // Redirect to page with selected ballot
		else
			dispatch(clearResults());
	}

	const refresh = () => {
		if (currentBallot)
			dispatch(loadResults(currentBallot.id));
		else
			dispatch(clearResults());
	}

	return (
		<>
			<TopRow style={{maxWidth}}>
				<BallotSelector onBallotSelected={onBallotSelected}	/>
				<div style={{display: 'flex'}}>
					<ResultsExport ballot={currentBallot} />
					<TableColumnSelector selectors={resultsSelectors} actions={resultsActions} columns={tableColumns} />
					<ActionButton
						name='refresh'
						title='Refresh'
						disabled={!currentBallot}
						onClick={refresh}
					/>
				</div>
			</TopRow>
			<ResultsSummary
				style={{maxWidth}}
			/>
			<TableRow style={{maxWidth}}>
				<AppTable
					defaultTablesConfig={defaultTablesConfig}
					columns={tableColumns}
					headerHeight={28}
					estimatedRowHeight={32}
					selectors={resultsSelectors}
					actions={resultsActions}
				/>
			</TableRow>
		</>
	)
}

export default Results;
