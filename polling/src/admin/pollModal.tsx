import React from "react";
import { AppModal, Row, Button, FieldLeft, Checkbox } from "dot11-components";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
	selectPollingAdminSelectedPoll,
	pollingAdminUpdatePoll,
	setSelectedPollId,
	Poll,
	PollCreate,
	Event,
	PollType,
	PollChoice,
	pollingAdminPollAction,
	selectPollingAdminEventEntities,
	motionPollOptions,
} from "../store/pollingAdmin";
import Editor from "../editor";
import cn from "./pollModal.module.css";

function titlePrefix(type: PollType, index: number) {
	return (type === "m" ? "Motion " : "Strawpoll ") + (index + 1).toString();
}

const maxIndex = (polls: Poll[]) =>
	polls.reduce(
		(maxIndex, poll) => (maxIndex > poll.index ? maxIndex : poll.index),
		0
	);

export function defaultMotion(event: Event, polls: Poll[]) {
	const type = "m";
	const index = maxIndex(polls) + 1;
	return {
		eventId: event.id,
		index,
		title: titlePrefix(type, index),
		body: "",
		type,
		options: [...motionPollOptions],
		choice: PollChoice.SINGLE,
	} satisfies PollCreate;
}

export function defaultStrawpoll(event: Event, polls: Poll[]) {
	const type = "sp";
	const index = maxIndex(polls) + 1;
	return {
		eventId: event.id,
		index,
		title: titlePrefix(type, index),
		body: "",
		type,
		options: [],
		choice: PollChoice.SINGLE,
	} satisfies PollCreate;
}

function LabeledToggle<V = string>({
	className,
	label,
	value,
	onChange,
	options,
}: {
	className?: string;
	label: string;
	value: V;
	onChange: (value: V) => void;
	options: { label: string; value: V }[];
}) {
	const widestLabel = options.reduce(
		(w, o) => (o.label.length > w.length ? o.label : w),
		""
	);
	const i = options.findIndex((o) => o.value === value);
	const selectedLabel = i >= 0 ? options[i].label : "(Blank)";

	function toggle() {
		let ii = i + 1;
		if (ii >= options.length) ii = 0;
		onChange(options[ii].value);
	}
	return (
		<div className={cn.toggle + (className ? " " + className : "")}>
			<label>{label}</label>
			<button
				style={{ position: "relative", cursor: "pointer" }}
				onClick={toggle}
			>
				<span style={{ visibility: "hidden" }}>{widestLabel}</span>
				<span style={{ position: "absolute", left: 10 }}>
					{selectedLabel}
				</span>
			</button>
		</div>
	);
}

const pollTypeOptions: { label: string; value: PollType }[] = [
	{ label: "Motion", value: "m" },
	{ label: "Strawpoll", value: "sp" },
];

function PollTypeSelect({
	value,
	onChange,
}: {
	value: PollType;
	onChange: (value: PollType) => void;
}) {
	return (
		<LabeledToggle
			label="Poll:"
			options={pollTypeOptions}
			value={value}
			onChange={onChange}
		/>
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
		<div className={cn.pollTitle}>
			<input
				type="text"
				value={value}
				onChange={(e) => onChange(e.target.value)}
			/>
		</div>
	);
}

function PollOptions({ options }: { options: string[] }) {
	return (
		<div className={cn.pollOptions}>
			{options.map((o, i) => (
				<div key={i} className={cn.pollOption}>
					<Checkbox />
					<label>{o}</label>
				</div>
			))}
		</div>
	);
}

const pollChoiceOptions: { label: string; value: PollChoice }[] = [
	{ value: PollChoice.SINGLE, label: "Choose one" },
	{ value: PollChoice.MULTIPLE, label: "Choose many" },
];
function PollOptionChoice({
	value,
	onChange,
}: {
	value: PollChoice;
	onChange: (value: PollChoice) => void;
}) {
	return (
		<LabeledToggle
			className={cn.pollChoice}
			label="Voting:"
			options={pollChoiceOptions}
			value={value}
			onChange={onChange}
		/>
	);
}

function PollOptionEdit({
	index,
	value,
	onChange,
	onDelete,
	onTab,
	setRef,
}: {
	index: number;
	value: string;
	onChange: (value: string) => void;
	onDelete: () => void;
	onTab: () => void;
	setRef: (ref: HTMLInputElement | null) => void;
}) {
	function keyPress(e: React.KeyboardEvent) {
		if (e.key === "Tab") onTab();
	}
	return (
		<div className={cn.pollOption + " " + cn.edit}>
			<Checkbox disabled={true} />
			<input
				ref={(ref) => setRef(ref)}
				type="text"
				value={value}
				onKeyDown={keyPress}
				onChange={(e) => onChange(e.target.value)}
				placeholder={"Option " + (index + 1)}
			/>
			<button onClick={onDelete}>
				<i className="bi-trash" />
			</button>
		</div>
	);
}

function PollOptionsEdit({
	poll,
	changePoll,
}: {
	poll: Poll;
	changePoll: (changes: Partial<Poll>) => void;
}) {
	const inputRefs = React.useRef<(HTMLInputElement | null)[]>([]);
	const buttonRef = React.useRef<HTMLButtonElement | null>(null);
	let options = [...poll.options];
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

	return (
		<>
			<div className={cn.pollOptions}>
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
					/>
				))}
				<div className={cn.pollOption} style={{ display: "flex" }}>
					<Checkbox
						style={{ visibility: "hidden" }}
						disabled={true}
					/>
					<button
						className={cn.addButton}
						ref={(ref) => {
							buttonRef.current = ref;
						}}
						onClick={addOption}
					>
						+ Option
					</button>
				</div>
			</div>
			<PollOptionChoice
				value={poll.choice}
				onChange={(choice) => changePoll({ choice })}
			/>
		</>
	);
}

function PollForm({
	event,
	poll,
	close,
}: {
	event: Event;
	poll: Poll;
	close: () => void;
}) {
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
		if (event.autoNumber && ("type" in changes || "title" in changes)) {
			let changedPoll = { ...editPoll, ...changes };
			let prefix = titlePrefix(changedPoll.type, changedPoll.index);
			if (!changedPoll.title.startsWith(prefix)) {
				changes.title = changedPoll.title.replace(
					/^(M|S)[a-z]*\s+[0-9]+/i,
					prefix
				);
				if (!changes.title.startsWith(prefix)) {
					if (changes.title)
						changes.title = prefix + " " + changedPoll.title;
					else changes.title = prefix;
				}
			}
		}
		if ("type" in changes) {
			if (changes.type === "m") changes.options = [...motionPollOptions];
			else changes.options = [];
		}
		setEditPoll((poll) => ({ ...poll, ...changes }));
		dispatch(pollingAdminUpdatePoll({ id: poll.id, changes }));
	}

	return (
		<>
			<div className={cn.actionRow}>
				<PollTypeSelect
					value={editPoll.type}
					onChange={(type) => changePoll({ type })}
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
			</div>
			<div className={cn.pollTitleRow}>
				<PollTitle
					value={editPoll.title}
					onChange={(title) => changePoll({ title })}
				/>
			</div>
			<div className={cn.pollBodyRow} style={{ position: "relative" }}>
				<Editor
					style={{ width: "100%" }}
					value={editPoll.body}
					onChange={(body) => changePoll({ body })}
				/>
			</div>
			<div
				className={cn.pollOptionsRow}
				style={{ alignItems: "flex-start" }}
			>
				{poll.type === "m" ? (
					<PollOptions options={poll.options} />
				) : (
					<PollOptionsEdit poll={poll} changePoll={changePoll} />
				)}
			</div>
			{poll.type === "m" && (
				<Row>
					<FieldLeft label="Moved:">
						<input type="text" />
					</FieldLeft>
					<FieldLeft label="Seconded:">
						<input type="text" />
					</FieldLeft>
				</Row>
			)}
		</>
	);
}

function PollModal() {
	const dispatch = useAppDispatch();
	const poll = useAppSelector(selectPollingAdminSelectedPoll);
	const eventEntities = useAppSelector(selectPollingAdminEventEntities);
	const event = poll ? eventEntities[poll.eventId] : undefined;
	const close = () => dispatch(setSelectedPollId(null));

	return (
		<AppModal
			style={{ width: "60%" }}
			isOpen={Boolean(poll)}
			onRequestClose={close}
			parentSelector={() => document.querySelector("#root")}
		>
			{poll && event && (
				<PollForm event={event} poll={poll} close={close} />
			)}
		</AppModal>
	);
}

export default PollModal;
