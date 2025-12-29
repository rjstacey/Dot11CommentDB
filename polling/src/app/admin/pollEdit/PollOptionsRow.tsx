import React from "react";
import { Form, Button, Row, Col } from "react-bootstrap";
import cx from "classnames";
import type { Poll } from "@/store/pollingAdmin";
import { PollVotingChoiceSelect } from "./PollVotingChoiceSelect";

import css from "./PollEdit.module.css";

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
		<label className={css.pollOption + " " + css.edit}>
			<Form.Check id={id} disabled={true} />
			<input
				id={id + "-label"}
				ref={(ref) => setRef(ref)}
				type="text"
				value={value}
				onKeyDown={keyPress}
				onChange={(e) => onChange(e.target.value)}
				placeholder={"Option " + (index + 1)}
				disabled={disabled}
				readOnly={readOnly}
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
		</label>
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
			<div className={css.pollOption} style={{ display: "flex" }}>
				<Form.Check style={{ visibility: "hidden" }} disabled={true} />
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
			<div className={css.pollOptions}>
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
			</div>
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
		<Row className="mb-3">
			<Col>
				<PollOptionsEdit
					poll={poll}
					changePoll={changePoll}
					disabled={disabled}
					readOnly={poll.type === "m"}
				/>
			</Col>
			<Col>
				<PollVotingChoiceSelect
					className={cx(
						"mt-3",
						poll.type === "m" && "visually-hidden"
					)}
					value={poll.choice}
					onChange={(choice) => changePoll({ choice })}
					disabled={disabled}
				/>
			</Col>
		</Row>
	);
}
