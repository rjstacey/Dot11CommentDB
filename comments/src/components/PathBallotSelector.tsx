import React from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import styled from '@emotion/styled';

import { Select } from 'dot11-components';

import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
	getBallots,
	setCurrentProject,
	setCurrentId,
	selectBallotsState,
	selectProjectOptions,
	selectBallotOptions
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
	options,
	loading,
	readOnly
}: {
	className?: string;
	style?: React.CSSProperties;
	value: string;
	onChange: (value: string) => void;
	options: {value: any; label: string}[];
	loading: boolean;
	readOnly?: boolean;
}) {

	const values = options.filter(o => o.value === value);

	if (readOnly)
		return <span>{values.length? values[0].label: value}</span>

	const handleChange = (values: typeof options) => onChange(values.length > 0? values[0].value: 0);

	return (
		<Select
			style={style}
			className={className}
			values={values}
			onChange={handleChange}
			options={options}
			loading={loading}
		/>
	)
}

function BallotSelect({
	style,
	className,
	value,
	onChange,
	options,
	loading,
	readOnly
}: {
	className?: string;
	style?: React.CSSProperties;
	value: number;
	onChange: (value: number) => void;
	options: {value: any; label: string}[];
	loading: boolean;
	readOnly?: boolean;
}) {

	const values = options.filter(o => o.value === value);

	if (readOnly)
		return <span>{values.length? values[0].label: value}</span>

	const handleChange = (values: typeof options) => onChange(values.length > 0? values[0].value: 0);

	return (
		<Select
			style={style}
			className={className}
			values={values}
			onChange={handleChange}
			options={options}
			loading={loading}
			readOnly={options.length === 0}
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
	const {loading, currentProject, currentId} = useAppSelector(selectBallotsState);
	const projectOptions = useAppSelector(selectProjectOptions);
	const ballotOptions = useAppSelector(selectBallotOptions);

	React.useEffect(() => {
		let ignore = false;
		async function onMount() {
			const ballots = await dispatch(getBallots());
			if (ignore)
				return;
			if (ballotId) {
				const pathBallot_id = ballots.find(b => b.BallotID === ballotId)?.id;
				// Routed here with parameter ballotId specified, but not matching stored currentId; set the current ballot
				if (pathBallot_id && (!currentId || pathBallot_id !== currentId))
					dispatch(setCurrentId(pathBallot_id));
			}
			else if (currentId) {
				// Routed here with parameter ballotId unspecified, but current ballot has previously been selected; re-route to current ballot
				const BallotID = ballots.find(b => b.id === currentId)?.BallotID;
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

	const handleProjectChange = async (value: string) => {
		if (value !== currentProject) {
			const ballot = await dispatch(setCurrentProject(value));
			let pathName = location.pathname.replace(`/${ballotId}`, '');
			if (ballot)
				pathName = pathName + `/${ballot.BallotID}`;
			navigate(pathName);

			if (onBallotSelected)
				onBallotSelected(null);
		}
	}

	const handleBallotChange = async (value: number) => {
		const ballot = await dispatch(setCurrentId(value));
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
				value={currentProject}
				onChange={handleProjectChange}
				options={projectOptions}
				loading={loading}
				readOnly={readOnly}
			/>
			<Label>Ballot:</Label>
			<BallotSelect
				style={{minWidth: 250}}
				value={currentId}
				onChange={handleBallotChange}
				options={ballotOptions}
				loading={loading}
				readOnly={readOnly}
			/>
		</Container>
	)
}

export default BallotSelector;
