import type { Poll } from "@/store/pollingAdmin";
import MemberSelector from "@/components/MemberSelector";
import css from "@/components/poll-layout.module.css";

export function PollMovedRow({
	poll,
	changePoll,
}: {
	poll: Poll;
	changePoll: (changes: Partial<Poll>) => void;
}) {
	return (
		<div className={css["poll-moved-row"]}>
			<div className={css["poll-moved-col"]}>
				<label htmlFor="poll-moved">Moved:</label>
				<MemberSelector
					id="poll-moved"
					style={{ width: 300 }}
					value={poll.movedSAPIN}
					onChange={(movedSAPIN) => changePoll({ movedSAPIN })}
				/>
			</div>
			<div className={css["poll-moved-col"]}>
				<label htmlFor="poll-seconded">Second:</label>
				<MemberSelector
					id="poll-seconded"
					style={{ width: 300 }}
					value={poll.secondedSAPIN}
					onChange={(secondedSAPIN) => changePoll({ secondedSAPIN })}
				/>
			</div>
		</div>
	);
}
