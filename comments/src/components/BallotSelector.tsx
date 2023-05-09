import React from 'react';
import styled from '@emotion/styled';

import { useAppDispatch, useAppSelector } from '../store/hooks';

import { Select, EntityId } from 'dot11-components';

import {
	loadBallots,
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
	onBallotSelected?: (ballot_id: number) => void;
}) {
	const dispatch = useAppDispatch();
	const {valid, loading, currentProject, currentId} = useAppSelector(selectBallotsState);
	const projectOptions = useAppSelector(selectProjectOptions);
	const ballotOptions = useAppSelector(selectBallotOptions);

	React.useEffect(() => {
		if (!valid && !loading)
			dispatch(loadBallots());
	}, []);	// eslint-disable-line react-hooks/exhaustive-deps

	const handleProjectChange = (value: string) => {
		dispatch(setCurrentProject(value));
		if (onBallotSelected)
			onBallotSelected(0);
	}

	const handleBallotChange = (value: number) => {
		dispatch(setCurrentId(value));
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
