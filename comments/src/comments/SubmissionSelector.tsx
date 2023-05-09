import React from 'react';
import {createSelector} from '@reduxjs/toolkit';

import { Select, SelectItemRendererProps } from 'dot11-components';

import { useAppSelector } from '../store/hooks';
import { selectCommentsState, commentsSelectors } from '../store/comments';


/*
 * Render submission. If it looks like a DCN then link to mentor.
 */
 export const renderSubmission = (submission: string) => {
 	if (!submission)
 		return '';
	let text = submission;
	let gg = '11';
 	let m = text.match(/^(\d{1,2})-/);
 	if (m) {
 		gg = ('0' + m[1]).slice(-2);
 		text = text.replace(/^\d{1,2}-/, '');
 	}
 	m = text.match(/(\d{2})\/(\d{1,4})r(\d+)/);
	if (m) {
		const yy = ('0' + m[1]).slice(-2);
		const nnnn = ('0000' + m[2]).slice(-4);
		const rr = ('0' + m[3]).slice(-2);
		const href = `https://mentor.ieee.org/802.11/dcn/${yy}/${gg}-${yy}-${nnnn}-${rr}`;
		return <a style={{pointerEvents: 'unset'}} href={href}>{submission}</a>
	}
	return submission;
}

const selectItemRenderer = ({item}: SelectItemRendererProps) => renderSubmission(item.label);

const field = 'Submission';

const selectFieldValues = createSelector(
	commentsSelectors.selectIds,
	commentsSelectors.selectEntities,
	(ids, entities) => {
		return [...new Set(ids.map(id => commentsSelectors.getField(entities[id]!, field) as string))]
			.filter(v => v !== '') // remove blank entry (we use 'clear' to set blank)
			.map(v => ({label: v, value: v}))
	}
);

function SubmissionSelector({
	value,
	onChange,
	...otherProps
}: {
	value: string;
	onChange: (value: string) => void;
	readOnly?: boolean;
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

	const handleChange = (values: typeof options) => onChange(values.length? values[0].value: '');

	return (
		<Select
			values={values}
			onChange={handleChange}
			options={options}
			loading={loading}
			create
			clearable
			selectItemRenderer={selectItemRenderer}
			{...otherProps}
		/>
	)
}

export default SubmissionSelector;
