import { Form, Button } from "react-bootstrap";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import cx from "clsx";
import {
	Poll,
	pollingUserSubmitVote,
	selectPollingUserActivePoll,
	selectPollingUserState,
	setPollVotes,
	PollChoice,
} from "@/store/pollingUser";
import MemberShow from "@/components/MemberShow";
import css from "@/components/poll-layout.module.css";

function PollTitleRow({ poll }: { poll: Poll }) {
	return (
		<div className={css["poll-title-row"]}>
			<h2 className={css["poll-title"]}>{poll.title}</h2>
		</div>
	);
}

function PollBodyRow({ poll }: { poll: Poll }) {
	return (
		<div
			className={css["poll-body-row"]}
			dangerouslySetInnerHTML={{ __html: poll.body }}
		/>
	);
}

function PollOptionsRow({
	poll,
	readOnly,
}: {
	poll: Poll;
	readOnly?: boolean;
}) {
	const dispatch = useAppDispatch();

	const { submitMsg, pollVotes } = useAppSelector(selectPollingUserState);

	function toggleVote(index: number) {
		let newVotes = pollVotes.slice();
		if (poll.choice === PollChoice.MULTIPLE) {
			const i = newVotes.indexOf(index);
			if (i >= 0) newVotes.splice(i, 1);
			else newVotes.push(index);
		} else {
			newVotes = [index];
		}
		dispatch(setPollVotes(newVotes));
	}

	function submitVote() {
		dispatch(pollingUserSubmitVote());
	}

	return (
		<div className={css["poll-options-row"]}>
			<div className={css["poll-options-col1"]}>
				{poll.options.map((o, i) => {
					const id = `poll-option-${i}`;
					return (
						<div key={id} className={css["poll-option"]}>
							<Form.Check
								id={id}
								checked={pollVotes.includes(i)}
								onChange={() => toggleVote(i)}
								readOnly={readOnly}
								tabIndex={readOnly ? -1 : undefined}
							/>
							<label htmlFor={id}>{o}</label>
						</div>
					);
				})}
			</div>
			<div className={css["poll-options-col2"]}>
				<Button
					variant="outline-primary"
					onClick={submitVote}
					disabled={poll.state !== "opened"}
					className={readOnly ? "visually-hidden" : undefined}
				>
					{"Submit"}
				</Button>
				<span>{submitMsg}&nbsp;</span>
			</div>
		</div>
	);
}

function PollMovedRow({ poll, readOnly }: { poll: Poll; readOnly?: boolean }) {
	const isHidden =
		poll.type !== "m" ||
		(readOnly && !poll.movedSAPIN && !poll.secondedSAPIN);
	return (
		<div
			className={cx(css["poll-moved-row"], isHidden && "visually-hidden")}
		>
			<div className={css["poll-moved-col"]}>
				<span>Moved:</span>
				<MemberShow id="moved" sapin={poll.movedSAPIN} />
			</div>
			<div className={css["poll-moved-col"]}>
				<span>Seconded:</span>
				<MemberShow id="seconded" sapin={poll.secondedSAPIN} />
			</div>
		</div>
	);
}

function PollState({ poll }: { poll: Poll }) {
	return <div>State: {poll.state}</div>;
}

export function PollDetail({
	poll,
	readOnly,
}: {
	poll: Poll;
	readOnly?: boolean;
}) {
	return (
		<>
			<PollState poll={poll} />
			<PollTitleRow poll={poll} />
			<PollBodyRow poll={poll} />
			<PollOptionsRow poll={poll} readOnly={readOnly} />
			<PollMovedRow poll={poll} readOnly={readOnly} />
		</>
	);
}

export function CurrentPoll() {
	const poll = useAppSelector(selectPollingUserActivePoll);

	if (!poll) return null;

	return <PollDetail poll={poll} />;
}
