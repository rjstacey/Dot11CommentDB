import PropTypes from 'prop-types'
import React from 'react'
import {useHistory, useParams} from 'react-router-dom'
import {connect} from 'react-redux'
import styled from '@emotion/styled'
import AppTable from 'dot11-components/table'
import {ActionButton} from 'dot11-components/lib/icons'
import {AccessLevel} from 'dot11-components/lib/user'
import BallotSelector from '../ballots/BallotSelector'
import ResultsSummary from './ResultsSummary'
import ResultsExport from './ResultsExport'
import {upsertTableColumns} from 'dot11-components/store/ui'

import {loadResults} from '../store/results'
import {setBallotId, BallotType} from '../store/ballots'

// The action row height is determined by its content
const ActionRow = styled.div`
	display: flex;
	justify-content: space-between;
	align-items: center;
	width: 100%;
	padding: 10px;
	box-sizing: border-box;
`;

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
				if (type === BallotType.SA_Initial || type == BallotType.SA_Recirc)
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

function updateTableConfig(upsertTableColumns, access, type) {
	if (access < AccessLevel.SubgroupAdmin) {
		upsertTableColumns(undefined, {
			SAPIN: {shown: false},
			Email: {shown: false}
		});
	}
	else {
		if (type === BallotType.SA_Initial || type == BallotType.SA_Recirc)
			upsertTableColumns(undefined, {
				SAPIN: {shown: false},
				Email: {shown: true}
			});
		else
			upsertTableColumns(undefined, {
				SAPIN: {shown: true},
				Email: {shown: true}
			});
	}
}

const maxWidth = 1024;

function Results({
	access,
	ballot,
	resultsSummary,
	votingPoolSize,
	valid,
	loading,
	loadResults,
	setBallotId,
	ballotId: currentBallotId,
	upsertTableColumns
}) {
	const {ballotId} = useParams();
	const history = useHistory();

	const defaultTablesConfig = React.useMemo(() => getDefaultTablesConfig(access, ballot.Type));

	React.useEffect(() => updateTableConfig(upsertTableColumns, access, ballot.Type), [access, ballot.Type]);

	React.useEffect(() => {
		if (ballotId) {
			if (ballotId !== currentBallotId) {
				// Routed here with parameter ballotId specified, but not matching stored ballotId
				// Store the ballotId and get results for this ballotId
				setBallotId(ballotId);
				loadResults(ballotId);
			}
			else if (!loading && (!valid || ballot.BallotID !== ballotId)) {
				loadResults(ballotId);
			}
		}
		else if (currentBallotId) {
			history.replace(`/Results/${currentBallotId}`);
		}
	}, [ballotId, currentBallotId, ballot.BallotID, history, valid, setBallotId, loadResults]);

	const onBallotSelected = (ballotId) => history.push(`/Results/${ballotId}`); // Redirect to page with selected ballot

	return (
		<>
			<ActionRow style={{maxWidth}}>
				<BallotSelector onBallotSelected={onBallotSelected}	/>
				<div style={{display: 'flex'}}>
					<ResultsExport ballotId={ballotId} ballot={ballot} />
					<ActionButton name='refresh' title='Refresh' onClick={() => loadResults(ballotId)} />
				</div>
			</ActionRow>
			<ResultsSummary
				style={{maxWidth}}
				ballot={ballot}
				resultsSummary={resultsSummary}
				votingPoolSize={votingPoolSize}
			/>
			<TableRow style={{maxWidth}}>
				<AppTable
					defaultTablesConfig={defaultTablesConfig}
					columns={tableColumns}
					headerHeight={28}
					estimatedRowHeight={32}
					dataSet={dataSet}
					rowKey='id'
				/>
			</TableRow>
		</>
	)
}

Results.propTypes = {
	ballotId: PropTypes.string.isRequired,
	ballot: PropTypes.object.isRequired,
	resultsSummary: PropTypes.object.isRequired,
	votingPoolSize: PropTypes.number.isRequired,
	valid: PropTypes.bool.isRequired,
	loading: PropTypes.bool.isRequired,
	loadResults: PropTypes.func.isRequired,
	setBallotId: PropTypes.func.isRequired,
	upsertTableColumns: PropTypes.func.isRequired
}

const dataSet = 'results'
export default connect(
	(state) => ({
			ballotId: state.ballots.ballotId,
			ballot: state[dataSet].ballot,
			resultsSummary: state[dataSet].resultsSummary,
			votingPoolSize: state[dataSet].votingPoolSize,
			valid: state[dataSet].valid,
			loading: state[dataSet].loading,
		}),
	{
		loadResults,
		setBallotId,
		upsertTableColumns: (tableView, tableColumns) => upsertTableColumns(dataSet, tableView, tableColumns)
	}
)(Results);