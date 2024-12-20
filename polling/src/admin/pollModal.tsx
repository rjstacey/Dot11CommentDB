import React from "react";
import { AppModal, Row, Button } from "dot11-components";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
	selectPollingAdminSelectedPoll,
	pollingAdminUpdatePoll,
	setSelectedPollId,
	Poll,
	PollType,
	pollingAdminPollAction,
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

function PollOptions() {
	return (
		<ul>
			<li>Yes</li>
			<li>No</li>
			<li>Abstain</li>
		</ul>
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

	function toggleShowPoll() {
		dispatch(
			pollingAdminPollAction(poll.id, poll.state ? "unshow" : "show")
		);
	}

	function openPoll() {
		dispatch(pollingAdminPollAction(poll.id, "open"));
	}

	function closePoll() {
		dispatch(pollingAdminPollAction(poll.id, "close"));
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
				<Button
					isActive={poll.state === "shown"}
					onClick={toggleShowPoll}
				>
					Show
				</Button>
				<Button isActive={poll.state === "opened"} onClick={openPoll}>
					Open
				</Button>
				<Button isActive={poll.state === "closed"} onClick={closePoll}>
					Close
				</Button>
				<Button onClick={close}>x</Button>
			</Row>
			<Row>
				<PollTitle
					value={editPoll.title}
					onChange={(title) => changePoll({ title })}
				/>
			</Row>
			<Row>
				<Editor
					body={editPoll.body}
					onChangeBody={(body) => changePoll({ body })}
					preview={false}
				/>
			</Row>
			<Row>
				<PollOptions />
			</Row>
		</>
	);
}

function PollModal() {
	const dispatch = useAppDispatch();
	const poll = useAppSelector(selectPollingAdminSelectedPoll);
	function close() {
		dispatch(setSelectedPollId(null));
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
