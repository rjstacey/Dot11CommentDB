import PropTypes from 'prop-types';
import React from 'react';
import {useDispatch, useSelector} from 'react-redux';
import styled from '@emotion/styled';

import {Select} from 'dot11-components/form';

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

function ProjectSelect({style, className, value, onChange, options, loading, readOnly}) {

	const values = options.filter(o => o.value === value);

	if (readOnly)
		return values.length? values[0].label: value

	const handleChange = (values) => onChange(values.length > 0? values[0].value: 0);

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

function BallotSelect({style, className, value, onChange, options, loading, readOnly}) {

	const values = options.filter(o => o.value === value);

	if (readOnly)
		return values.length? values[0].label: value

	const handleChange = (values) => onChange(values.length > 0? values[0].value: 0);

	return (
		<Select
			style={style}
			className={className}
			values={values}
			onChange={handleChange}
			options={options}
			loading={loading}
			disabled={options.length === 0}
		/>
	)
}

function BallotSelector({
	className,
	style,
	readOnly,
	onBallotSelected
}) {
	const dispatch = useDispatch();
	const {valid, loading, currentProject, currentId} = useSelector(selectBallotsState);
	const projectOptions = useSelector(selectProjectOptions);
	const ballotOptions = useSelector(selectBallotOptions);

	React.useEffect(() => {
		if (!valid && !loading)
			dispatch(loadBallots());
	}, []);	// eslint-disable-line react-hooks/exhaustive-deps

	const handleProjectChange = (value) => {
		dispatch(setCurrentProject(value));
		if (onBallotSelected)
			onBallotSelected(0);
	}

	const handleBallotChange = (value) => {
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

BallotSelector.propTypes = {
	readOnly: PropTypes.bool,
	onBallotSelected: PropTypes.func,
}

export default BallotSelector;