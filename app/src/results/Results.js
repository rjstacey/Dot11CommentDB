import PropTypes from 'prop-types'
import React from 'react'
import {useHistory, useParams} from 'react-router-dom'
import {connect} from 'react-redux'
import Immutable from 'immutable'
import styled from '@emotion/styled'
import AppTable from '../table/AppTable'
import BallotSelector from '../ballots/BallotSelector'
import {getResults} from '../actions/results'
import {setBallotId} from '../actions/ballots'
import {ActionButton} from '../general/Icons'
import ResultsSummary from './ResultsSummary'
import ResultsExportModal from './ResultsExport'

// The action row height is determined by its content
const ActionRow = styled.div`
	display: flex;
	justify-content: space-between;
`;

// The table row grows to the available height
const TableRow = styled.div`
	flex: 1;
`;

const tableColumns = Immutable.OrderedMap({
	SAPIN: 			{label: 'SA PIN',		width: 75},
	Name: 			{label: 'Name',			width: 200},
	Affiliation: 	{label: 'Affiliation',	width: 200},
	Email: 			{label: 'Email',		width: 250},
	Vote: 			{label: 'Vote',			width: 210},
	CommentCount: 	{label: 'Comments',		width: 110},
	Notes: 			{label: 'Notes',		width: 250,	flexShrink: 1, flexGrow: 1}
});

function Results({
		ballot,
		resultsSummary,
		votingPoolSize,
		resultsValid,
		loading,
		getResults,
		setBallotId,
		...props
	}) {
	const {ballotId} = useParams()
	const history = useHistory()

	const [showExportModal, setShowExportModal] = React.useState(false)

	let columns, primaryDataKey
	if (ballot.Type === 3 || ballot.Type === 4) {
		columns = tableColumns.slice(1, tableColumns.size)
		primaryDataKey = 'Email'
	}
	else {
		columns = tableColumns
		primaryDataKey = 'SAPIN'
	}

	const width = Math.min(window.innerWidth, columns.reduce((acc, col) => acc + col.width, 0) + 40)

	React.useEffect(() => {
		if (ballotId) {
			if (ballotId !== props.ballotId) {
				// Routed here with parameter ballotId specified, but not matching stored ballotId
				// Store the ballotId and get results for this ballotId
				setBallotId(ballotId)
				getResults(ballotId)
			}
			else if (!loading && (!resultsValid || ballot.BallotID !== ballotId)) {
				getResults(ballotId)
			}
		}
		else if (props.ballotId) {
			history.replace(`/Results/${props.ballotId}`)
		}
	}, [ballotId, props.ballotId])

	const onBallotSelected = (ballotId) => history.push(`/Results/${ballotId}`); // Redirect to page with selected ballot

	return (
		<React.Fragment>
			<ActionRow style={{width}}>
				<span>
					<BallotSelector
						onBallotSelected={onBallotSelected}
					/>
				</span>
				<span>
					<ActionButton name='export' title='Export' onClick={() => setShowExportModal(true)} />
					<ActionButton name='refresh' title='Refresh' onClick={() => getResults(ballotId)} />
				</span>
			</ActionRow>
			<ResultsSummary
				style={{width}}
				ballot={ballot}
				resultsSummary={resultsSummary}
				votingPoolSize={votingPoolSize}
			/>
			<TableRow style={{width}}>
				<AppTable
					columns={columns}
					headerHeight={28}
					estimatedRowHeight={32}
					dataSet={'results'}
					rowKey={primaryDataKey}
				/>
			</TableRow>
			<ResultsExportModal
				ballot={ballot}
				isOpen={showExportModal}
				close={() => setShowExportModal(false)}
			/>
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
	getResults: PropTypes.func.isRequired,
	setBallotId: PropTypes.func.isRequired
}

const dataSet = 'results'
export default connect(
	(state, ownProps) => ({
		ballotId: state.ballots.ballotId,
		ballot: state[dataSet].ballot,
		resultsSummary: state[dataSet].resultsSummary,
		votingPoolSize: state[dataSet].votingPoolSize,
		resultsValid: state[dataSet].valid,
		loading: state[dataSet].loading,
	}),
	(dispatch, ownProps) => ({
		getResults: ballotId => dispatch(getResults(ballotId)),
		setBallotId: ballotId => dispatch(setBallotId(ballotId))
	})
)(Results);