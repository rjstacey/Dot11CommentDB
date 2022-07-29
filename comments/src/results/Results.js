import PropTypes from 'prop-types';
import React from 'react';
import {useHistory, useParams} from 'react-router-dom';
import {useDispatch, useSelector} from 'react-redux';
import styled from '@emotion/styled';

import AppTable, {TableColumnSelector} from 'dot11-components/table';
import {ActionButton} from 'dot11-components/form';
import {AccessLevel} from 'dot11-components/lib';
import {upsertTableColumns} from 'dot11-components/store/appTableData';

import TopRow from '../components/TopRow';
import BallotSelector from '../components/BallotSelector';
import ResultsSummary from './ResultsSummary';
import ResultsExport from './ResultsExport';

import {loadResults, clearResults, selectResultsState, dataSet} from '../store/results';
import {setBallotId, selectBallotsState, getCurrentBallot, BallotType} from '../store/ballots';

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

const tableColumns = [
	{key: 'SAPIN',			label: 'SA PIN',		width: 75},
	{key: 'Name', 			label: 'Name',			width: 200, cellRenderer: renderItem},
	{key: 'Affiliation',	label: 'Affiliation',	width: 200, cellRenderer: renderItem},
	{key: 'Email', 			label: 'Email',			width: 250, cellRenderer: renderItem},
	{key: 'Vote', 			label: 'Vote',			width: 210},
	{key: 'CommentCount', 	label: 'Comments',		width: 110},
	{key: 'Notes', 			label: 'Notes',			width: 250,	flexShrink: 1, flexGrow: 1}
];

function getDefaultTablesConfig(access, type) {
	const columns = tableColumns.reduce((o, c) => {
			const columnConfig = {
				shown: true,
				width: c.width
			};
			if (c.key === 'SAPIN') {
				if (access < AccessLevel.SubgroupAdmin)
					columnConfig.shown = false;
				if (type === BallotType.SA)
					columnConfig.shown = false;
			}
			if (c.key === 'Email') {
				if (access < AccessLevel.SubgroupAdmin) {
					columnConfig.shown = false;
				}
			}
			o[c.key] = columnConfig;
			return o;
		}, {});
	return {default: {fixed: false, columns}};
}

function updateTableConfigAction(access, type) {
	if (access < AccessLevel.SubgroupAdmin)
		return upsertTableColumns(dataSet, undefined, {SAPIN: {shown: false}, Email: {shown: false}});

	if (type === BallotType.SA)
		return upsertTableColumns(dataSet, undefined, {SAPIN: {shown: false}, Email: {shown: true}});

	return upsertTableColumns(dataSet, undefined, {SAPIN: {shown: true}, Email: {shown: true}});
}

const maxWidth = 1600;

function Results({
	access,
}) {
	const history = useHistory();
	const {ballotId} = useParams();

	const {loading, ballot_id: resultsBallot_id} = useSelector(selectResultsState);
	const {entities: ballotEntities} = useSelector(selectBallotsState);
	const currentBallot = useSelector(getCurrentBallot);
	
	const dispatch = useDispatch();

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
			history.replace(`/results/${currentBallot.BallotID}`);
		}
	}, [dispatch, history, ballotId, currentBallot]);

	React.useEffect(() => {
		if (!loading && currentBallot && resultsBallot_id !== currentBallot.id)
			dispatch(loadResults(currentBallot.id));
	}, [dispatch, loading, currentBallot, resultsBallot_id]);

	const onBallotSelected = (ballot_id) => {
		const ballot = ballotEntities[ballot_id];
		if (ballot)
			history.push(`/results/${ballot.BallotID}`); // Redirect to page with selected ballot
		else
			dispatch(clearResults());
	}

	const refresh = () => {
		dispatch(loadResults(currentBallot.id));
	}

	return (
		<>
			<TopRow style={{maxWidth}}>
				<BallotSelector onBallotSelected={onBallotSelected}	/>
				<div style={{display: 'flex'}}>
					<ResultsExport ballot={currentBallot} />
					<TableColumnSelector dataSet={dataSet} columns={tableColumns} />
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
					dataSet={dataSet}
				/>
			</TableRow>
		</>
	)
}

Results.propTypes = {
	access: PropTypes.number.isRequired
}

export default Results;
