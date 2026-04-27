import { useState, useCallback, useEffect } from "react";
import { useAppDispatch } from "@/store/hooks";
import {
	pollingAdminPollUpdate,
	pollingAdminPollDelete,
	pollingAdminPollAction,
	Poll,
	PollChoice,
	PollAction,
	motionPollOptions,
	setSelectedPollId,
} from "@/store/pollingAdmin";

export function usePollEdit(poll: Poll, readOnly?: boolean) {
	const dispatch = useAppDispatch();
	const [edited, setEdited] = useState(poll);

	const onChange = useCallback(
		(changes: Partial<Poll>) => {
			if (readOnly) {
				console.warn("pollEdit: onChange while readOnly");
				return;
			}
			if ("type" in changes) {
				const changedPoll = { ...edited, ...changes };
				let title: string;
				if (changes.type === "m") {
					const m = /(strawpoll)/i.exec(changedPoll.title);
					const motionStr = m && m[1][0] == "s" ? "motion" : "Motion";
					title = changedPoll.title.replace(/strawpoll/i, motionStr);
				} else {
					const m = /(motion)/i.exec(changedPoll.title);
					const strawpollStr =
						m && m[1][0] == "m" ? "strawpoll" : "Strawpoll";
					title = changedPoll.title.replace(/motion/i, strawpollStr);
				}
				if (title !== changedPoll.title) changes.title = title;

				if (changes.type === "m") {
					changes.options = [...motionPollOptions];
					changes.choice = PollChoice.SINGLE;
				} else {
					changes.options = [];
				}
			}
			setEdited((edited) => ({ ...edited, ...changes }));
			dispatch(pollingAdminPollUpdate({ id: poll.id, changes }));
		},
		[edited, poll.id],
	);

	const onAction = useCallback(
		async (action: PollAction) => {
			const state = await dispatch(
				pollingAdminPollAction(poll.id, action),
			);
			setEdited((edited) => ({ ...edited, state }));
		},
		[edited, poll.id],
	);

	const onDelete = useCallback(async () => {
		dispatch(setSelectedPollId(null));
		await dispatch(pollingAdminPollDelete(poll.id));
	}, [poll.id]);

	useEffect(() => {
		setEdited(poll);
	}, [poll.id]);

	return { edited, onChange, onAction, onDelete };
}
