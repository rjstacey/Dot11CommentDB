import React from "react";
import { useAppDispatch } from "@/store/hooks";
import {
	pollingAdminUpdatePoll,
	Poll,
	PollChoice,
	motionPollOptions,
} from "@/store/pollingAdmin";

export function usePollEdit(poll: Poll) {
	const dispatch = useAppDispatch();
	const [edited, setEdited] = React.useState(poll);

	const onChange = React.useCallback(
		(changes: Partial<Poll>) => {
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
			console.log("changes", changes);
			setEdited((edited) => ({ ...edited, ...changes }));
			dispatch(pollingAdminUpdatePoll({ id: poll.id, changes }));
		},
		[edited, poll.id]
	);

	React.useEffect(() => {
		console.log("update");
		setEdited(poll);
	}, [poll.id]);

	return { edited, onChange };
}
