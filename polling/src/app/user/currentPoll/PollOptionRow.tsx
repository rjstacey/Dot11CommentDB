import React from "react";
import { Form, Button } from "react-bootstrap";
import { useAppSelector } from "@/store/hooks";
import cx from "clsx";
import { type Poll, selectPollingUserPollVotes } from "@/store/pollingUser";
import css from "@/components/poll-layout.module.css";
import { usePollVote } from "@/hooks/pollVote";

export function PollOptionsRow({
	poll,
	readOnly,
}: {
	poll: Poll;
	readOnly?: boolean;
}) {
	const pollVotes = useAppSelector(selectPollingUserPollVotes);
	const { busy, successful, votes, toggleVote, submitVote } = usePollVote(
		poll,
		pollVotes,
		readOnly
	);

	readOnly = readOnly || poll.state !== "opened";

	return (
		<div className={css["poll-options-row"]}>
			<div className={css["poll-options-col1"]}>
				{poll.options.map((o, i) => {
					const id = `poll-option-${i}`;
					return (
						<div
							key={id}
							className={cx(
								css["poll-option"],
								readOnly && "pe-none"
							)}
						>
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
				{readOnly ? (
					pollVotes && <span>You voted</span>
				) : (
					<Button
						variant="outline-primary"
						onClick={submitVote}
						disabled={
							poll.state !== "opened" ||
							votes.length === 0 ||
							busy
						}
						className={readOnly ? "visually-hidden" : undefined}
					>
						{"Submit"}
						<i
							className={
								"ms-1 " +
								(busy ? "bi-dot" : successful ? "bi-check" : "")
							}
						/>
					</Button>
				)}
			</div>
		</div>
	);
}
