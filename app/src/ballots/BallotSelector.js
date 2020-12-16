import PropTypes from 'prop-types'
import React from 'react'
import {connect} from 'react-redux'
import Select from 'react-dropdown-select'
import {getBallots, setProject, setBallotId} from '../actions/ballots'
import {getProjectList, getBallotList} from '../selectors/ballots'
import styled from '@emotion/styled'

const Container = styled.div`
	display: flex;
	flex-direction: row;
	align-items: center;
`;

const Label = styled.label`
	font-weight: bold;
	margin: 10px;
`;

const StyledSelect = styled(Select)`
	min-height: 22px;
	width: unset;
`;

function ProjectSelect({project, setProject, projectList, loading, readOnly}) {

	if (readOnly)
		return project

	const options = projectList.map(p => ({value: p, label: p}))
	const value = options.find(o => o.value === project)

	function handleChange(values) {
		const value = values.length > 0? values[0].value: ''
		if (value !== project)
			setProject(value)
	}

	return (
		<StyledSelect
			styled={{minWidth: 100}}
			values={value? [value]: []}
			onChange={handleChange}
			options={options}
			loading={loading}
		/>
	)
}

function BallotSelect({ballotId, setBallotId, ballotList, loading, readOnly}) {

	const value = ballotList.find(o => o.value === ballotId)

	if (readOnly)
		return value? value.label: ballotId

	function handleChange(values) {
		const value = values.length > 0? values[0].value: ''
		if (value !== ballotId)
			setBallotId(value)
	}

	return (
		<StyledSelect
			style={{minWidth: 250}}
			values={value? [value]: []}
			onChange={handleChange}
			options={ballotList}
			loading={loading}
			disabled={ballotList.length === 0}
		/>
	)
}

function BallotSelector({
	valid,
	loading,
	project,
	setProject,
	projectList,
	ballotId,
	setBallotId,
	ballotList,
	getBallots,
	readOnly,
	onBallotSelected
}) {

	React.useEffect(() => {
		if (!valid)
			getBallots()
	}, [])

	function handleBallotChange(value) {
		setBallotId(value)
		if (onBallotSelected)
			onBallotSelected(value)
	}

	return (
		<Container>
			<Label>Project:</Label>
			<ProjectSelect
				project={project}
				setProject={setProject}
				projectList={projectList}
				loading={loading}
				readOnly={readOnly}
			/>
			<Label>Ballot:</Label>
			<BallotSelect
				ballotId={ballotId}
				setBallotId={handleBallotChange}
				ballotList={ballotList}
				loading={loading}
				readOnly={readOnly}
			/>
		</Container>
	)
}

BallotSelector.propTypes = {
	project: PropTypes.string.isRequired,
	ballotId: PropTypes.string.isRequired,
	projectList: PropTypes.array.isRequired,
	ballotList: PropTypes.array.isRequired,
	loading: PropTypes.bool.isRequired,
	getBallots: PropTypes.func.isRequired,
	setProject: PropTypes.func.isRequired,
	setBallotId: PropTypes.func.isRequired,
}

export default connect(
	(state) => {
		const s = state.ballots
		return {
			project: s.project,
			ballotId: s.ballotId,
			projectList: getProjectList(state),
			ballotList: getBallotList(state),
			valid: s.valid,
			loading: s.loading,
		}
	},
	(dispatch) => ({
		getBallots: () => dispatch(getBallots()),
		setProject: (project) => dispatch(setProject(project)),
		setBallotId: (ballotId) => dispatch(setBallotId(ballotId))
	})
)(BallotSelector)