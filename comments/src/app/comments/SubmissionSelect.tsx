import * as React from "react";
import { createSelector } from "@reduxjs/toolkit";

import { Select, SelectRendererProps } from "@common";

import { useAppSelector } from "@/store/hooks";
import {
	selectCommentsState,
	selectCommentIds,
	selectCommentEntities,
	getField,
} from "@/store/comments";
import { selectBallotsState } from "@/store/ballots";

/*
 * If it looks like a DCN then link to mentor.
 * gg-yy-nnnn-rr or yy-nnnn-rr or gg-yy-nnnn"r"rr or yy-nnnn"r"rr
 */
export const submissionHref = (
	groupName: string | null,
	submission: string | null
) => {
	if (!submission) return null;
	if (!groupName) return null;
	let gg: string | null = null,
		yy: string | null = null,
		nnnn: string | null = null,
		rr: string | null = null,
		m: RegExpMatchArray | null;
	// default group comes from groupName
	m = groupName.match(/\.\d{1,2}$/);
	if (m) gg = ("0" + m[0].slice(1)).slice(-2);
	// gg-yy-nnnn-rr or gg-yy-nnnn"r"rr or yy-nnnn-rr or yy-nnnn"r"rr or yy-nnnn
	m = submission.match(
		/^((\d{1,2})-){0,1}(\d{2})[-/](\d{1,4})([r-](\d{1,2}))*$/
	);
	if (m) {
		if (m[2]) gg = ("0" + m[2]).slice(-2);
		yy = ("0" + m[3]).slice(-2);
		nnnn = ("000" + m[4]).slice(-4);
		if (m[6]) rr = ("0" + m[6]).slice(-2);
	}
	if (gg && yy && nnnn) {
		let dcn = `${gg}-${yy}-${nnnn}`;
		if (rr) dcn += `-${rr}`;
		return `https://mentor.ieee.org/${groupName}/dcn/${yy}/${dcn}`;
	}
	return null;
};

/*
 * Render submission
 */
export const renderSubmission = (
	groupName: string | null,
	submission: string | null
) => {
	const href = submissionHref(groupName, submission);
	if (href) {
		return (
			<a style={{ pointerEvents: "auto" }} href={href}>
				{submission}
			</a>
		);
	}
	return submission;
};

type Option = { label: string; value: string };

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
	...props
}: {
	value: string;
	onChange: (value: string) => void;
} & Pick<
	React.ComponentProps<typeof Select>,
	"placeholder" | "readOnly" | "disabled" | "id" | "style"
>) {
	const { loading } = useAppSelector(selectCommentsState);
	const { groupName } = useAppSelector(selectBallotsState);
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
			selectItemRenderer={({ item }) =>
				renderSubmission(groupName, item.label)
			}
			{...props}
		/>
	);
}
