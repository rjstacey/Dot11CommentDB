import React from "react";
import { Form, Button } from "react-bootstrap";
import isEqual from "lodash.isequal";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import cx from "clsx";
import {
	Poll,
	pollingUserSubmitVote,
	selectPollingUserActivePoll,
	selectPollingUserPollVotes,
	PollChoice,
} from "@/store/pollingUser";
import MemberShow from "@/components/MemberShow";
import { PollState } from "./PollState";
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
	const [busy, setBusy] = React.useState(false);
	const [ok, setOk] = React.useState(false);
	const pollVotes = useAppSelector(selectPollingUserPollVotes);
	const [votes, setVotes] = React.useState<number[]>([]);

	React.useEffect(() => {
		if (pollVotes && pollVotes.pollId === poll.id) {
			setVotes(pollVotes.votes);
		} else {
			setVotes([]);
		}
	}, [pollVotes, poll.id]);

	function toggleVote(index: number) {
		let newVotes = votes.slice();
		if (poll.choice === PollChoice.MULTIPLE) {
			const i = newVotes.indexOf(index);
			if (i >= 0) newVotes.splice(i, 1);
			else newVotes.push(index);
		} else {
			newVotes = [index];
		}
		if (!isEqual(newVotes, votes)) setOk(false);
		setVotes(newVotes);
	}

	async function submitVote() {
		setOk(false);
		setBusy(true);
		const ok = await dispatch(pollingUserSubmitVote(poll.id, votes));
		setOk(ok);
		setBusy(false);
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
								checked={votes.includes(i)}
								onChange={() => toggleVote(i)}
								readOnly={readOnly}
								tabIndex={readOnly ? -1 : undefined}
								label={o}
							/>
						</div>
					);
				})}
			</div>
			<div className={css["poll-options-col2"]}>
				<Button
					variant="outline-primary"
					onClick={submitVote}
					disabled={poll.state !== "opened" || busy}
					className={readOnly ? "visually-hidden" : undefined}
				>
					{"Submit"}
					<i
						className={
							"ms-1 " + (busy ? "bi-dot" : ok ? "bi-check" : "")
						}
					/>
				</Button>
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

export function PollDetail({
	poll,
	readOnly,
}: {
	poll: Poll;
	readOnly?: boolean;
}) {
	return (
		<>
			<PollState state={poll.state} />
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
