import React from "react";
import { Form, Button } from "react-bootstrap";
import cx from "clsx";
import type { Poll } from "@/store/pollingAdmin";
import { PollVotingChoiceSelect } from "./PollVotingChoiceSelect";

import css from "@/components/poll-layout.module.css";

function PollOptionEdit({
	index,
	value,
	onChange,
	onDelete,
	onTab,
	setRef,
	disabled,
	readOnly,
}: {
	index: number;
	value: string;
	onChange: (value: string) => void;
	onDelete: () => void;
	onTab: () => void;
	setRef: (ref: HTMLInputElement | null) => void;
	disabled?: boolean;
	readOnly?: boolean;
}) {
	function keyPress(e: React.KeyboardEvent) {
		if (e.key === "Tab") onTab();
	}
	const id = `poll-option-${index}`;
	return (
		<div
			className={cx(css["poll-option"], readOnly && "pe-none", css.edit)}
		>
			<Form.Check id={id} className="me-2 pe-none" />
			<Form.Control
				type="text"
				id={id + "-label"}
				ref={(ref) => setRef(ref)}
				value={value}
				onKeyDown={keyPress}
				onChange={(e) => onChange(e.target.value)}
				placeholder={"Option " + (index + 1)}
				disabled={disabled}
				className={readOnly ? "pe-none" : undefined}
				tabIndex={readOnly ? -1 : undefined}
			/>
			{!readOnly && (
				<button
					onClick={onDelete}
					disabled={disabled}
					role="button"
					aria-label={`Delete option ${index + 1}`}
				>
					<i className="bi-trash" />
				</button>
			)}
		</div>
	);
}

export function PollOptionsEdit({
	poll,
	changePoll,
	readOnly,
	disabled,
}: {
	poll: Poll;
	changePoll: (changes: Partial<Poll>) => void;
	readOnly?: boolean;
	disabled?: boolean;
}) {
	const inputRefs = React.useRef<(HTMLInputElement | null)[]>([]);
	const buttonRef = React.useRef<HTMLButtonElement | null>(null);
	const options = [...poll.options];
	if (options.length < 2) options.unshift("");
	if (options.length < 2) options.unshift("");

	function changeOptions(index: number, value: string) {
		options[index] = value;
		console.log(options);
		changePoll({ options });
	}

	function addOption() {
		options.push("");
		changePoll({ options });
	}

	function deleteOption(i: number) {
		if (options.length >= 2) options.splice(i, 1);
		else options[i] = "";
		changePoll({ options });
	}

	function onTab(i: number) {
		i++;
		if (i === options.length) buttonRef.current?.focus();
		inputRefs.current[i]?.focus();
	}

	let addOptionRow: JSX.Element | null = null;
	if (!readOnly) {
		addOptionRow = (
			<div className={css["poll-option"]}>
				<Button
					type="button"
					variant="light"
					ref={(ref) => {
						buttonRef.current = ref;
					}}
					onClick={addOption}
					disabled={disabled}
				>
					<i className="bi-plus-lg me-2" />
					{"Option"}
				</Button>
			</div>
		);
	}

	return (
		<>
			{options.map((o, i) => (
				<PollOptionEdit
					setRef={(ref) => {
						inputRefs.current[i] = ref;
					}}
					key={i}
					index={i}
					value={o}
					onChange={(v) => changeOptions(i, v)}
					onDelete={() => deleteOption(i)}
					onTab={() => onTab(i)}
					disabled={disabled}
					readOnly={readOnly}
				/>
			))}
			{addOptionRow}
		</>
	);
}

export function PollOptionsRow({
	poll,
	changePoll,
	disabled,
}: {
	poll: Poll;
	changePoll: (changes: Partial<Poll>) => void;
	readOnly?: boolean;
	disabled?: boolean;
}) {
	return (
		<div className={css["poll-options-row"]}>
			<div className={css["poll-options-col1"]}>
				<PollOptionsEdit
					poll={poll}
					changePoll={changePoll}
					disabled={disabled}
					readOnly={poll.type === "m"}
				/>
			</div>
			<div className={css["poll-options-col2"]}>
				<PollVotingChoiceSelect
					className={cx(
						"mt-3",
						poll.type === "m" && "visually-hidden"
					)}
					value={poll.choice}
					onChange={(choice) => changePoll({ choice })}
					disabled={disabled}
				/>
			</div>
		</div>
	);
}
