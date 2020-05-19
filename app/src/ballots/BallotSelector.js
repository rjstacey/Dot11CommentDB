import React from 'react'
import {connect} from 'react-redux'
import Select from 'react-dropdown-select'
import {getBallots, setProject, setBallotId} from '../actions/ballots'

/** @jsx jsx */
import { css, jsx } from '@emotion/core'

function BallotSelector(props) {
	const {valid, loading, project, projectList, ballotId, ballotList, getBallots, setProject, setBallotId, readOnly, onBallotSelected} = props

	React.useEffect(() => {
		if (!valid) {
			getBallots()
		}
	}, [])

	function handleProjectChange(values) {
		const value = values.length > 0? values[0].value: ''
		if (value !== project) {
			setProject(value)
		}
	}

	function handleBallotChange(values) {
		const value = values.length > 0? values[0].value: ''
		setBallotId(value)
		if (onBallotSelected) {
			onBallotSelected(value)
		}
	}

	function ProjectSelector(props) {
		const options = projectList
		const value = options.find(o => o.value === project)
		if (readOnly) {
			return project
		}
		else {
			return (
				<Select
					values={value? [value]: []}
					onChange={handleProjectChange}
					options={options}
					loading={loading}
					{...props}
				/>
			)
		}
	}

	function BallotSelector(props) {
		const options = ballotList
		const value = options.find(o => o.value === ballotId)
		if (readOnly) {
			return value? value.label: ballotId
		}
		else {
			return (
				<Select
					values={value? [value]: []}
					onChange={handleBallotChange}
					options={options}
					loading={loading}
					disabled={ballotList.length === 0}
					{...props}
				/>
			)
		}
	}

	const containerCss = css`
		display: flex;
		flex-direction: row;
		align-items: center;
	`
	const labelCss = css`
		font-weight: bold;
		margin: 10px;
	`
	const selectorCss = css`
		min-height: 22px;
		width: unset;
	`
	const projectSelectorCss = css`
		${selectorCss}
		min-width: 100px;
	`
	const ballotSelectorCss = css`
		${selectorCss}
		min-width: 250px;
	`
	return (
		<div css={containerCss} >
			<label css={labelCss}>Project:</label>
			<ProjectSelector css={projectSelectorCss} />
			<label css={labelCss}>Ballot:</label>
			<BallotSelector css={ballotSelectorCss} />
		</div>
	)
}

export default connect(
	(state) => {
		const s = state.ballots
		return {
			project: s.project,
			ballotId: s.ballotId,
			projectList: s.projectList,
			ballotList: s.ballotList,
			valid: s.ballotsValid,
			loading: s.getBallots,
		}
	},
	(dispatch) => {
		return {
			getBallots: () => dispatch(getBallots()),
			setProject: (project) => dispatch(setProject(project)),
			setBallotId: (ballotId) => dispatch(setBallotId(ballotId))
		}
	}
)(BallotSelector)