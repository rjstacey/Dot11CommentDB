import PropTypes from 'prop-types'
import React from 'react'
import {useHistory, useParams} from 'react-router-dom'
import {connect} from 'react-redux'
import styled from '@emotion/styled'
import AppTable from 'dot11-common/table'
import {ActionButton} from 'dot11-common/lib/icons'
import {AccessLevel} from 'dot11-common/store/login'
import BallotSelector from '../ballots/BallotSelector'
import ResultsSummary from './ResultsSummary'
import ResultsExport from './ResultsExport'

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

function Results({
	access,
	ballot,
	resultsSummary,
	votingPoolSize,
	resultsValid,
	loading,
	loadResults,
	setBallotId,
	ballotId: currentBallotId,
}) {
	const {ballotId} = useParams()
	const history = useHistory()

	/* If we change the table config signficantly we want to remount the table component,
	 * so we create a key id for the component that depends on signficant parameters */
	const [tableId, columns, primaryDataKey, maxWidth] = React.useMemo(() => {
		let columns, primaryDataKey
		if (ballot.Type === BallotType.SA_Initial || ballot.Type === BallotType.SA_Recirc) {
			columns = tableColumns.filter(col => col.key !== 'SAPIN')
			primaryDataKey = 'Email'
		}
		else {
			columns = tableColumns
			primaryDataKey = 'SAPIN'
			if (access <= AccessLevel.SubgroupAdmin) {
				columns = columns.filter(col => col.key !== 'SAPIN')
			}
		}
		if (access <= AccessLevel.SubgroupAdmin) {
			columns = columns.filter(col => col.key !== 'Email')
		}
		const maxWidth = columns.reduce((acc, col) => acc + col.width, 0) + 40;
		return [primaryDataKey, columns, primaryDataKey, maxWidth]
	}, [ballot.Type, access]);

	React.useEffect(() => {
		if (ballotId) {
			if (ballotId !== currentBallotId) {
				// Routed here with parameter ballotId specified, but not matching stored ballotId
				// Store the ballotId and get results for this ballotId
				setBallotId(ballotId)
				loadResults(ballotId)
			}
			else if (!loading && (!resultsValid || ballot.BallotID !== ballotId)) {
				loadResults(ballotId)
			}
		}
		else if (currentBallotId) {
			history.replace(`/Results/${currentBallotId}`)
		}
	}, [ballotId, currentBallotId, ballot.BallotID, history, resultsValid, setBallotId, loadResults]);

	const onBallotSelected = (ballotId) => history.push(`/Results/${ballotId}`); // Redirect to page with selected ballot

	return (
		<React.Fragment>
			<ActionRow style={{maxWidth}}>
				<BallotSelector onBallotSelected={onBallotSelected}	/>
				<span>
					<ResultsExport ballotId={ballotId} ballot={ballot} />
					<ActionButton name='refresh' title='Refresh' onClick={() => loadResults(ballotId)} />
				</span>
			</ActionRow>
			<ResultsSummary
				style={{maxWidth}}
				ballot={ballot}
				resultsSummary={resultsSummary}
				votingPoolSize={votingPoolSize}
			/>
			<TableRow style={{maxWidth}}>
				<AppTable
					key={tableId}
					columns={columns}
					headerHeight={28}
					estimatedRowHeight={32}
					dataSet='results'
					rowKey={primaryDataKey}
				/>
			</TableRow>
		</React.Fragment>
	)
}

Results.propTypes = {
	ballotId: PropTypes.string.isRequired,
	ballot: PropTypes.object.isRequired,
	resultsSummary: PropTypes.object.isRequired,
	votingPoolSize: PropTypes.number.isRequired,
	resultsValid: PropTypes.bool.isRequired,
	loading: PropTypes.bool.isRequired,
	loadResults: PropTypes.func.isRequired,
	setBallotId: PropTypes.func.isRequired
}

const dataSet = 'results'
export default connect(
	(state) => ({
			ballotId: state.ballots.ballotId,
			ballot: state[dataSet].ballot,
			resultsSummary: state[dataSet].resultsSummary,
			votingPoolSize: state[dataSet].votingPoolSize,
			resultsValid: state[dataSet].valid,
			loading: state[dataSet].loading,
		}),
	{loadResults, setBallotId}
)(Results);