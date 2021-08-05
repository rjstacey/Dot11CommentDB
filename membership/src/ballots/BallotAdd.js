import PropTypes from 'prop-types'
import React from 'react'
import {AppModal} from 'dot11-components/modals';
//import AppModal from 'react-modal'
import {connect} from 'react-redux'
import styled from '@emotion/styled'
import {ActionButtonDropdown} from 'dot11-components/general/Dropdown'
import {ActionButton} from 'dot11-components/icons'
import {Form, Row, Col, Input, List, ListItem} from 'dot11-components/general/Form'
import {getData} from 'dot11-components/store/dataSelectors'

import {addBallot, setProject, getProjectList, getBallotList, BallotType} from '../store/ballots'

import {Column1, BallotTypeSelect, BallotStageSelect} from './BallotDetail'

const StyledForm = styled(Form)`
	width: 700px;
`;

function getDefaultBallot() {
	const now = new Date()
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
	return {
		Project: '',
		BallotID: '',
		EpollNum: '',
		Document: '',
		Topic: '',
		Start: today.toISOString(),
		End: today.toISOString(),
		VotingPoolID: '',
		PrevBallotID: ''
	}
}

function _BallotAddDropdown({
	defaultBallot,
	project,
	projectList,
	ballotList,
	votingPools,
	addBallot,
	setProject,
	close
}) {
	const [ballot, setBallot] = React.useState(defaultBallot || getDefaultBallot());
	const [errMsg, setErrMsg] = React.useState('');
	const [busy, setBusy] = React.useState(false);

	const submit = async () => {
		setBusy(true);
		await addBallot(ballot);
		setBusy(false);
		close();
	}

	const changeType = (e) => {
		const {name, value} = e.target;
		setBallot(ballot => ({...ballot, [name]: parseInt(value, 10)}));
	}

	return (
		<StyledForm
			title='Add ballot'
			submit={submit}
			submitText='Add'
			cancel={close}
			busy={busy}
		>
			<Row>
				<Col>
					<Column1
						project={project}
						setProject={setProject}
						projectList={projectList}
						ballot={ballot}
						setBallot={setBallot}
						ballotList={ballotList}
						votingPools={votingPools}
					/>
				</Col>
				<Col>
					<BallotTypeSelect
						value={ballot.Type}
						onChange={changeType}
					/>
					<BallotStageSelect
						value={ballot.Type}
						onChange={changeType}
					/>
				</Col>
			</Row>
		</StyledForm>
	)
}

_BallotAddDropdown.propTypes = {
	addBallot: PropTypes.func.isRequired,
	close: PropTypes.func.isRequired,
}

const BallotAddDropdown = connect(
	(state) => ({
		projectList: getProjectList(state),
		ballotList: getBallotList(state),
		votingPools: getData(state, 'votingPools'),
	}),
	{addBallot, setProject}
)(_BallotAddDropdown)

const BallotAdd = () => 
	<ActionButtonDropdown
		name='add'
		title='Add ballot' 
	>
		<BallotAddDropdown />
	</ActionButtonDropdown>

export const BallotAddModal = ({defaultBallot}) => {
	const [isOpen, setOpen] = React.useState(false);
	return (
		<div onClick={e => e.stopPropagation()}>
			<ActionButton
				name='add'
				title='Add ballot'
				onClick={e => setOpen(!isOpen)}
			/>
			<AppModal
				isOpen={isOpen}
				onRequestClose={() => setOpen(false)}
			>
				<BallotAddDropdown
					defaultBallot={defaultBallot}
					close={() => setOpen(false)}
				/>
			</AppModal>
		</div>
	)
}

export default BallotAdd;