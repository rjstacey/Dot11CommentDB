import React from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import { Select } from 'dot11-components';

import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
	setCurrentGroupProject,
	setCurrentBallot_id,
	selectBallotsState,
	selectGroupProjectOptions,
	selectBallotOptions,
	GroupProject,
} from '../store/ballots';

import styles from "./ProjectBallotSelector.module.css";

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
	readOnly,
}: {
	className?: string;
	style?: React.CSSProperties;
	value: number | null;
	onChange: (value: number | null) => void;
	loading: boolean;
	readOnly?: boolean;
}) {
	let ballots = useAppSelector(selectBallotOptions);
	const options = ballots.map(b => ({value: b.id, label: `${b.BallotID} ${b.Document}`}));
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
	readOnly,
}: {
	readOnly?: boolean;
}) {
	const navigate = useNavigate();
	const location = useLocation();
	const dispatch = useAppDispatch();
	const {ballotId} = useParams();
	const {loading, currentGroupId, currentProject, currentBallot_id} = useAppSelector(selectBallotsState);

	const handleProjectChange = async (value: GroupProject) => {
		const ballot = await dispatch(setCurrentGroupProject(value));
		let pathName = location.pathname.replace(`/${ballotId}`, '');
		if (ballot)
			pathName = pathName + `/${ballot.BallotID}`;
		navigate(pathName);
	}

	const handleBallotChange = async (value: number | null) => {
		const ballot = await dispatch(setCurrentBallot_id(value));
		let pathName = location.pathname.replace(`/${ballotId}`, '');
		if (ballot)
			pathName = pathName + `/${ballot.BallotID}`;
		navigate(pathName);
	}

	return (
		<div
			className={styles.main}
		>
			<label>Project:</label>
			<ProjectSelect
				style={{minWidth: 150, marginRight: 20}}
				value={{groupId: currentGroupId, project: currentProject}}
				onChange={handleProjectChange}
				loading={loading}
				readOnly={readOnly}
			/>
			<label>Ballot:</label>
			<BallotSelect
				style={{minWidth: 250}}
				value={currentBallot_id}
				onChange={handleBallotChange}
				loading={loading}
				readOnly={readOnly}
			/>
		</div>
	)
}

export default BallotSelector;
