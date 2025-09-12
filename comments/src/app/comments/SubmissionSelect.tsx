import * as React from "react";
import { createSelector } from "@reduxjs/toolkit";

import { Select, SelectItemRendererProps, SelectRendererProps } from "@common";

import { useAppSelector } from "@/store/hooks";
import {
	selectCommentsState,
	selectCommentIds,
	selectCommentEntities,
	getField,
} from "@/store/comments";

/*
 * Render submission. If it looks like a DCN then link to mentor.
 */
export const renderSubmission = (submission: string) => {
	if (!submission) return "";
	let text = submission;
	let gg = "11";
	let m = text.match(/^(\d{1,2})-/);
	if (m) {
		gg = ("0" + m[1]).slice(-2);
		text = text.replace(/^\d{1,2}-/, "");
	}
	m = text.match(/(\d{2})\/(\d{1,4})r(\d+)/);
	if (m) {
		const yy = ("0" + m[1]).slice(-2);
		const nnnn = ("0000" + m[2]).slice(-4);
		const rr = ("0" + m[3]).slice(-2);
		const href = `https://mentor.ieee.org/802.11/dcn/${yy}/${gg}-${yy}-${nnnn}-${rr}`;
		return (
			<a style={{ pointerEvents: "unset" }} href={href}>
				{submission}
			</a>
		);
	}
	return submission;
};

type Option = { label: string; value: string };

const selectItemRenderer = ({ item }: SelectItemRendererProps<Option>) =>
	renderSubmission(item.label);

const field = "Submission";
const selectFieldValues = createSelector(
	selectCommentIds,
	selectCommentEntities,
	(ids, entities) => {
		return [
			...new Set(
				ids.map((id) => getField(entities[id]!, field) as string)
			),
		]
			.filter((v) => v !== "") // remove blank entry (we use 'clear' to set blank)
			.map((v) => ({ label: v, value: v }));
	}
);

export function SubmissionSelect({
	value,
	onChange,
	...otherProps
}: {
	value: string;
	onChange: (value: string) => void;
} & Pick<
	React.ComponentProps<typeof Select>,
	"placeholder" | "readOnly" | "disabled" | "id" | "style"
>) {
	const { loading } = useAppSelector(selectCommentsState);
	const existingOptions = useAppSelector(selectFieldValues);
	const [options, setOptions] = React.useState(existingOptions);

	async function createOption({ state }: SelectRendererProps<Option>) {
		const option = { label: state.search, value: state.search };
		setOptions((options) => options.concat(option));
		return option;
	}

	const values = options.filter((o) => o.value === value);

	const handleChange = (values: typeof options) =>
		onChange(values.length ? values[0].value : "");

	return (
		<Select
			values={values}
			onChange={handleChange}
			options={options}
			loading={loading}
			clearable
			create
			createOption={createOption}
			selectItemRenderer={selectItemRenderer}
			{...otherProps}
		/>
	);
}
