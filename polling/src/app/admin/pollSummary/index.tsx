import type { Poll } from "@/store/pollingAdmin";
import { PollState } from "./PollState";
import cx from "clsx";

import "./pollSummary.css";

export function PollSummary({
	poll,
	className,
}: {
	poll: Poll;
	className?: string;
}) {
	return (
		<div className={cx("poll-summary", className)}>
			<div>
				<div className="title">{poll.title}</div>
				<div
					className="body"
					dangerouslySetInnerHTML={{ __html: poll.body }}
				/>
			</div>
			<PollState poll={poll} />
		</div>
	);
}
