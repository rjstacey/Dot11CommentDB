import React from "react";
import { AppModal, Form, Row, Button } from "dot11-components";
import { Poll, PollType } from "../schemas/poll";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
	pollingAdminOpenPoll,
	pollingAdminClosePoll,
	pollingAdminSelectPoll,
	pollingAdminUpdatePoll,
	selectPollAdminPoll,
} from "../store/pollingAdmin";
import Editor from "../editor/Editor";
import cn from "./admin.module.css";

function PollTypeSelect({
	value,
	onChange,
}: {
	value: PollType;
	onChange: (value: PollType) => void;
}) {
	function toggle() {
		onChange(value === "m" ? "sp" : "m");
	}
	return (
		<div className={cn.columnChoice}>
			<label className={cn.labeledCheckbox}>
				<input type="radio" checked={value === "m"} onChange={toggle} />
				<span>Motion</span>
			</label>
			<label className={cn.labeledCheckbox}>
				<input
					type="radio"
					checked={value === "sp"}
					onChange={toggle}
				/>
				<span>Strawpoll</span>
			</label>
		</div>
	);
}

function PollAutoNumber({
	value,
	onChange,
}: {
	value: boolean;
	onChange: (value: boolean) => void;
}) {
	return (
		<label className={cn.labeledCheckbox}>
			<input
				type="checkbox"
				checked={value}
				onChange={(e) => onChange(e.target.checked)}
			/>
			<span>Auto number</span>
		</label>
	);
}

function PollTitle({
	value,
	onChange,
}: {
	value: string;
	onChange: (value: string) => void;
}) {
	return (
		<input
			type="text"
			value={value}
			onChange={(e) => onChange(e.target.value)}
		/>
	);
}

function titlePrefix(poll: Poll) {
	let prefix = "";
	if (poll.autoNumber)
		prefix =
			(poll.type === "m" ? "Motion " : "Strawpoll ") +
			(poll.index + 1).toString() +
			" - ";
	return prefix;
}

function PollForm({ poll, close }: { poll: Poll; close: () => void }) {
	const dispatch = useAppDispatch();
	const [editPoll, setEditPoll] = React.useState(poll);

	function startPoll() {
		dispatch(pollingAdminOpenPoll(poll.id));
	}

	function stopPoll() {
		dispatch(pollingAdminClosePoll(poll.id));
	}

	function changePoll(changes: Partial<Poll>) {
		if (
			"type" in changes ||
			"autoNumber" in changes ||
			"title" in changes
		) {
			let changedPoll = { ...editPoll, ...changes };
			let prefix = titlePrefix(changedPoll);
			if (!changedPoll.title.startsWith(prefix)) {
				changes.title = changedPoll.title.replace(
					/^(M|S).*-\s*/i,
					prefix
				);
				if (!changes.title.startsWith(prefix)) {
					changes.title = prefix + changedPoll.title;
				}
			}
		}
		setEditPoll((poll) => ({ ...poll, ...changes }));
		dispatch(pollingAdminUpdatePoll({ id: poll.id, changes }));
	}

	return (
		<>
			<Row>
				<PollTypeSelect
					value={editPoll.type}
					onChange={(type) => changePoll({ type })}
				/>
				<PollAutoNumber
					value={editPoll.autoNumber}
					onChange={(autoNumber) => changePoll({ autoNumber })}
				/>
				<Button onClick={startPoll}>Start</Button>
				<Button onClick={stopPoll}>Stop</Button>
				<Button onClick={close}>Close</Button>
			</Row>
			<Row>
				<PollTitle
					value={editPoll.title}
					onChange={(title) => changePoll({ title })}
				/>
			</Row>
			<Form>
				<Editor
					subject={editPoll.title}
					body={editPoll.body}
					onChangeSubject={(title) => changePoll({ title })}
					onChangeBody={(body) => changePoll({ body })}
					preview={false}
				/>
			</Form>
		</>
	);
}

function PollModal() {
	const dispatch = useAppDispatch();
	const poll = useAppSelector(selectPollAdminPoll);
	function close() {
		dispatch(pollingAdminSelectPoll(null));
	}
	return (
		<AppModal
			isOpen={Boolean(poll)}
			onRequestClose={close}
			parentSelector={() => document.querySelector("#root")}
		>
			{poll && <PollForm poll={poll} close={close} />}
		</AppModal>
	);
}

export default PollModal;
