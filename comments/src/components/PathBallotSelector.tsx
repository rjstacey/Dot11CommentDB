import React from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import styled from '@emotion/styled';

import { Select } from 'dot11-components';

import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
	getBallots,
	setCurrentGroupProject,
	setCurrentBallot_id,
	selectBallotsState,
	selectGroupProjectOptions,
	selectBallotOptions,
	GroupProject
} from '../store/ballots';

const Label = styled.label`
	font-weight: bold;
	margin-right: 10px;
`;

const Container = styled.div`
	display: flex;
	align-items: center;
`;

function ProjectSelect({
	style,
	className,
	value,
	onChange,
	loading,
	readOnly
}: {
	className?: string;
	style?: React.CSSProperties;
	value: GroupProject;
	onChange: (value: GroupProject) => void;
	loading: boolean;
	readOnly?: boolean;
}) {
	const options = useAppSelector(selectGroupProjectOptions);
	const values = options.filter(o => value.groupId === o.groupId && value.project === o.project);
	const handleChange = (values: typeof options) => onChange(values.length > 0? values[0]: {groupId: null, project: null});

	return (
		<Select
			style={style}
			className={className}
			values={values}
			onChange={handleChange}
			options={options}
			loading={loading}
			readOnly={readOnly}
		/>
	)
}

function BallotSelect({
	style,
	className,
	value,
	onChange,
	loading,
	readOnly
}: {
	className?: string;
	style?: React.CSSProperties;
	value: number | null;
	onChange: (value: number | null) => void;
	loading: boolean;
	readOnly?: boolean;
}) {
	const options = useAppSelector(selectBallotOptions);
	const values = options.filter(o => o.value === value);
	const handleChange = (values: typeof options) => onChange(values.length > 0? values[0].value: 0);

	return (
		<Select
			style={style}
			className={className}
			values={values}
			onChange={handleChange}
			options={options}
			loading={loading}
			readOnly={readOnly || options.length === 0}
		/>
	)
}

function BallotSelector({
	className,
	style,
	readOnly,
	onBallotSelected
}: {
	className?: string;
	style?: React.CSSProperties;
	readOnly?: boolean;
	onBallotSelected?: (ballot_id: number | null) => void;
}) {
	const navigate = useNavigate();
	const location = useLocation();
	const dispatch = useAppDispatch();
	const {ballotId} = useParams();
	const {loading, currentGroupId, currentProject, currentBallot_id} = useAppSelector(selectBallotsState);

	React.useEffect(() => {
		let ignore = false;
		async function onMount() {
			const ballots = await dispatch(getBallots());
			if (ignore)
				return;
			if (ballotId) {
				const pathBallot_id = ballots.find(b => b.BallotID === ballotId)?.id;
				// Routed here with parameter ballotId specified, but not matching stored currentId; set the current ballot
				if (pathBallot_id && (!currentBallot_id || pathBallot_id !== currentBallot_id))
					dispatch(setCurrentBallot_id(pathBallot_id));
			}
			else if (currentBallot_id) {
				// Routed here with parameter ballotId unspecified, but current ballot has previously been selected; re-route to current ballot
				const BallotID = ballots.find(b => b.id === currentBallot_id)?.BallotID;
				if (BallotID)
					navigate(location.pathname + `/${BallotID}`);
			}
		}
		function onUnmount() {
			ignore = true;
		}

		onMount();
		return onUnmount;
	}, []);	// eslint-disable-line react-hooks/exhaustive-deps

	const handleProjectChange = async (value: GroupProject) => {
		const ballot = await dispatch(setCurrentGroupProject(value));
		let pathName = location.pathname.replace(`/${ballotId}`, '');
		if (ballot)
			pathName = pathName + `/${ballot.BallotID}`;
		navigate(pathName);

		if (onBallotSelected)
			onBallotSelected(null);
	}

	const handleBallotChange = async (value: number | null) => {
		const ballot = await dispatch(setCurrentBallot_id(value));
		let pathName = location.pathname.replace(`/${ballotId}`, '');
		if (ballot)
			pathName = pathName + `/${ballot.BallotID}`;
		navigate(pathName);
		if (onBallotSelected)
			onBallotSelected(value);
	}

	return (
		<Container
			className={className}
			style={style}
		>
			<Label>Project:</Label>
			<ProjectSelect
				style={{minWidth: 150, marginRight: 20}}
				value={{groupId: currentGroupId, project: currentProject}}
				onChange={handleProjectChange}
				loading={loading}
				readOnly={readOnly}
			/>
			<Label>Ballot:</Label>
			<BallotSelect
				style={{minWidth: 250}}
				value={currentBallot_id}
				onChange={handleBallotChange}
				loading={loading}
				readOnly={readOnly}
			/>
		</Container>
	)
}

export default BallotSelector;
