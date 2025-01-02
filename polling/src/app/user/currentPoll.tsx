import React from "react";
import { Row, Button, FieldLeft, Checkbox } from "dot11-components";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
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
} from "@/store/pollingAdmin";
import { selectPollingUserActivePoll } from "@/store/pollingUser";
import LabeledToggle from "@/components/toggle";
import MemberSelector from "@/components/MemberSelector";
import css from "./pollModal.module.css";

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
		<div className={css.pollTitle}>
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
		<div className={css.pollOptions}>
			{options.map((o, i) => (
				<div key={i} className={css.pollOption}>
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
			className={css.pollChoice}
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
		<div className={css.pollOption + " " + css.edit}>
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
					/>
				))}
				<div className={css.pollOption} style={{ display: "flex" }}>
					<Checkbox
						style={{ visibility: "hidden" }}
						disabled={true}
					/>
					<button
						className={css.addButton}
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

function PollActions({ poll }: { poll: Poll }) {
	const dispatch = useAppDispatch();

	let showDisabled = poll.state === "opened" || poll.state === "closed";

	let openDisabled =
		poll.state === null ||
		poll.state === "closed" ||
		(poll.type === "m" && (!poll.movedSAPIN || !poll.secondedSAPIN));

	let closeDisabled = poll.state === null || poll.state === "shown";

	function showPoll() {
		dispatch(
			pollingAdminPollAction(
				poll.id,
				poll.state === "shown" ? "unshow" : "show"
			)
		);
	}

	function openPoll() {
		dispatch(
			pollingAdminPollAction(
				poll.id,
				poll.state === "opened" ? "show" : "open"
			)
		);
	}

	function closePoll() {
		dispatch(
			pollingAdminPollAction(
				poll.id,
				poll.state === "closed" ? "open" : "close"
			)
		);
	}

	return (
		<>
			<Button
				isActive={
					poll.state === "shown" ||
					poll.state === "opened" ||
					poll.state === "closed"
				}
				onClick={showPoll}
				disabled={showDisabled}
			>
				Show
			</Button>
			<Button
				isActive={poll.state === "opened" || poll.state === "closed"}
				onClick={openPoll}
				disabled={openDisabled}
			>
				Open
			</Button>
			<Button
				isActive={poll.state === "closed"}
				onClick={closePoll}
				disabled={closeDisabled}
			>
				Close
			</Button>
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
			<div className={css.pollTitleRow}>
				<h2>{editPoll.title}</h2>
			</div>
			<div className={css.pollBodyRow}>
				<div dangerouslySetInnerHTML={{ __html: editPoll.body }} />
			</div>
			<div
				className={css.pollOptionsRow}
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
						<MemberSelector
							value={poll.movedSAPIN}
							onChange={(movedSAPIN) =>
								changePoll({ movedSAPIN })
							}
						/>
					</FieldLeft>
					<FieldLeft label="Seconded:">
						<MemberSelector
							value={poll.secondedSAPIN}
							onChange={(secondedSAPIN) =>
								changePoll({ secondedSAPIN })
							}
						/>
					</FieldLeft>
				</Row>
			)}
			<PollActions poll={poll} />
		</>
	);
}

function CurrentPoll() {
	const dispatch = useAppDispatch();
	const poll = useAppSelector(selectPollingUserActivePoll);
	const eventEntities = useAppSelector(selectPollingAdminEventEntities);
	const event = poll ? eventEntities[poll.eventId] : undefined;
	const close = () => dispatch(setSelectedPollId(null));

	if (!poll || !event) return null;

	return <PollForm event={event} poll={poll} close={close} />;
}

export default CurrentPoll;
