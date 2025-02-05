import React from "react";
import { AppModal, Row, Button, FieldLeft, Checkbox } from "dot11-components";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
	selectPollingAdminSelectedPoll,
	pollingAdminUpdatePoll,
	setSelectedPollId,
	Poll,
	Event,
	PollType,
	PollRecordType,
	PollChoice,
	pollingAdminPollAction,
	selectPollingAdminEventEntities,
	motionPollOptions,
	titlePrefix,
} from "@/store/pollingAdmin";
import Editor from "@/components/editor";
import LabeledToggle from "@/components/toggle";
import MemberSelector from "@/components/MemberSelector";
import css from "./pollModal.module.css";

const pollVisibilityOptions: { label: string; value: boolean }[] = [
	{ label: "Inactive", value: false },
	{ label: "Active", value: true },
];

function PollShow({
	value,
	onChange,
	disabled,
	className,
}: {
	value: boolean;
	onChange: (value: boolean) => void;
	disabled?: boolean;
	className?: string;
}) {
	return (
		<LabeledToggle
			className={className}
			label="Make this poll:"
			options={pollVisibilityOptions}
			value={value}
			onChange={onChange}
			disabled={disabled}
		/>
	);
}

const pollTypeOptions: { label: string; value: PollType }[] = [
	{ label: "Motion", value: "m" },
	{ label: "Strawpoll", value: "sp" },
];

function PollTypeSelect({
	value,
	onChange,
	disabled,
	className,
}: {
	value: PollType;
	onChange: (value: PollType) => void;
	disabled?: boolean;
	className?: string;
}) {
	return (
		<LabeledToggle
			className={className}
			label="Poll:"
			options={pollTypeOptions}
			value={value}
			onChange={onChange}
			disabled={disabled}
		/>
	);
}

const pollRecordOptions: { label: string; value: PollRecordType }[] = [
	{ label: "Anonymous", value: PollRecordType.ANONYMOUS },
	{ label: "Admin view", value: PollRecordType.ADMIN_VIEW },
	{ label: "Recorded", value: PollRecordType.RECORDED },
];

function PollRecordTypeSelect({
	value,
	onChange,
	disabled,
	className,
}: {
	value: PollRecordType;
	onChange: (value: PollRecordType) => void;
	disabled?: boolean;
	className?: string;
}) {
	return (
		<LabeledToggle
			className={className}
			label="Result:"
			options={pollRecordOptions}
			value={value}
			onChange={onChange}
			disabled={disabled}
		/>
	);
}

function PollTitle({
	value,
	onChange,
	disabled,
}: {
	value: string;
	onChange: (value: string) => void;
	disabled?: boolean;
}) {
	return (
		<div className={css.pollTitle}>
			<input
				id="poll-title"
				type="text"
				value={value}
				onChange={(e) => onChange(e.target.value)}
				disabled={disabled}
			/>
		</div>
	);
}

function PollOptions({ options }: { options: string[] }) {
	return (
		<div className={css.pollOptions}>
			{options.map((o, i) => {
				const id = `poll-option-${i}`;
				return (
					<div key={id} className={css.pollOption}>
						<Checkbox id={id} disabled={true} />
						<label htmlFor={id}>{o}</label>
					</div>
				);
			})}
		</div>
	);
}

const pollChoiceOptions: { label: string; value: PollChoice }[] = [
	{ value: PollChoice.SINGLE, label: "Select one" },
	{ value: PollChoice.MULTIPLE, label: "Select many" },
];
function PollOptionChoice({
	value,
	onChange,
	disabled,
}: {
	value: PollChoice;
	onChange: (value: PollChoice) => void;
	disabled?: boolean;
}) {
	return (
		<LabeledToggle
			className={css.pollChoice}
			label="Voting choice:"
			options={pollChoiceOptions}
			value={value}
			onChange={onChange}
			disabled={disabled}
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
	disabled,
}: {
	index: number;
	value: string;
	onChange: (value: string) => void;
	onDelete: () => void;
	onTab: () => void;
	setRef: (ref: HTMLInputElement | null) => void;
	disabled?: boolean;
}) {
	function keyPress(e: React.KeyboardEvent) {
		if (e.key === "Tab") onTab();
	}
	const id = `poll-option-${index}`;
	return (
		<label className={css.pollOption + " " + css.edit}>
			<Checkbox id={id} disabled={true} />
			<input
				id={id + "-label"}
				ref={(ref) => setRef(ref)}
				type="text"
				value={value}
				onKeyDown={keyPress}
				onChange={(e) => onChange(e.target.value)}
				placeholder={"Option " + (index + 1)}
				disabled={disabled}
			/>
			<button onClick={onDelete} disabled={disabled}>
				<i className="bi-trash" />
			</button>
		</label>
	);
}

function PollOptionsEdit({
	poll,
	changePoll,
	disabled,
}: {
	poll: Poll;
	changePoll: (changes: Partial<Poll>) => void;
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
						disabled={disabled}
					>
						+ Option
					</button>
				</div>
			</div>
		</>
	);
}

function PollActions({ poll }: { poll: Poll }) {
	const dispatch = useAppDispatch();

	const openDisabled =
		poll.state === null ||
		poll.state === "closed" ||
		(poll.type === "m" && (!poll.movedSAPIN || !poll.secondedSAPIN));

	const closeDisabled = poll.state === null || poll.state === "shown";

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

	const disabled = poll.state === "opened" || poll.state === "closed";

	const changePoll = (changes: Partial<Poll>) => {
		if (event.autoNumber && ("type" in changes || "title" in changes)) {
			const changedPoll = { ...editPoll, ...changes };
			const prefix = titlePrefix(changedPoll.type, changedPoll.index);
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
			if (changes.type === "m") {
				changes.options = [...motionPollOptions];
				changes.choice = PollChoice.SINGLE;
			} else {
				changes.options = [];
			}
		}
		setEditPoll((poll) => ({ ...poll, ...changes }));
		dispatch(pollingAdminUpdatePoll({ id: poll.id, changes }));
	};

	function setShowPoll(show: boolean) {
		dispatch(pollingAdminPollAction(poll.id, show ? "show" : "unshow"));
	}

	return (
		<>
			<div className={css.topRow}>
				<div className={css.topRowGroup}>
					<PollTypeSelect
						className={css.topRowItem}
						value={editPoll.type}
						onChange={(type) => changePoll({ type })}
						disabled={disabled}
					/>

					<PollRecordTypeSelect
						className={css.topRowItem}
						value={editPoll.recordType}
						onChange={(recordType) => changePoll({ recordType })}
						disabled={disabled}
					/>
				</div>
				<div className={css.topRowGroup}>
					<PollShow
						className={css.topRowItem}
						value={Boolean(poll.state)}
						onChange={setShowPoll}
						disabled={
							poll.state === "opened" || poll.state === "closed"
						}
					/>
					<Button onClick={close}>x</Button>
				</div>
			</div>
			<div className={css.pollTitleRow}>
				<PollTitle
					value={editPoll.title}
					onChange={(title) => changePoll({ title })}
					disabled={disabled}
				/>
			</div>
			<div className={css.pollBodyRow} style={{ position: "relative" }}>
				<Editor
					style={{ width: "100%" }}
					value={editPoll.body}
					onChange={(body) => changePoll({ body })}
					readOnly={disabled}
				/>
			</div>
			<div
				className={css.pollOptionsRow}
				style={{ alignItems: "flex-start" }}
			>
				{poll.type === "m" ? (
					<PollOptions options={poll.options} />
				) : (
					<PollOptionsEdit
						poll={poll}
						changePoll={changePoll}
						disabled={disabled}
					/>
				)}
				<div style={{ display: "flex", flexDirection: "column" }}>
					<PollOptionChoice
						value={poll.choice}
						onChange={(choice) => changePoll({ choice })}
						disabled={disabled || poll.type === "m"}
					/>
				</div>
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
		>
			{poll && event && (
				<PollForm event={event} poll={poll} close={close} />
			)}
		</AppModal>
	);
}

export default PollModal;
