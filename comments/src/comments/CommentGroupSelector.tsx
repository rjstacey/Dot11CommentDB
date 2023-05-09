import React from 'react';
import { createSelector } from '@reduxjs/toolkit';

import { Select } from 'dot11-components';

import { useAppSelector } from '../store/hooks';
import { selectCommentsState, commentsSelectors } from '../store/comments';

const field = 'CommentGroup';

const selectFieldValues = createSelector(
	commentsSelectors.selectIds,
	commentsSelectors.selectEntities,
	(ids, entities) => {
		return [...new Set(ids.map(id => commentsSelectors.getField(entities[id]!, field)))]
			.filter(v => v !== '') // remove blank entry (we use 'clear' to set blank)
			.map(v => ({label: v, value: v}))
	}
);

function CommentGroupSelector({
	value,
	onChange,
	...otherProps
}: {
	value: string;
	onChange: (value: string) => void;
} & Omit<React.ComponentProps<typeof Select>, "values" | "onChange" | "options">
) {
	const {loading} = useAppSelector(selectCommentsState);
	let options = useAppSelector(selectFieldValues);
	let values = options.filter(o => o.value === value);

	if (value && values.length === 0) {
		// Make sure the current value is an option
		const option = {label: value, value};
		options = options.concat(option);
		values = [option];
	}

	const handleChange = (values) => onChange(values.length? values[0].value: '');

	return (
		<Select
			values={values}
			onChange={handleChange}
			options={options}
			loading={loading}
			create
			clearable
			{...otherProps}
		/>
	)
}

export default CommentGroupSelector;
