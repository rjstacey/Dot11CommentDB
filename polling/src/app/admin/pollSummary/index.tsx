import type { Poll } from "@/store/pollingAdmin";
import { PollState } from "./PollState";
import cx from "clsx";
import css from "./PollSummary.module.css";

export function PollSummary({
	poll,
	className,
}: {
	poll: Poll;
	className?: string;
}) {
	return (
		<div className={cx(css.summary, className)}>
			<div>
				<div className={css.title}>{poll.title}</div>
				<div
					className={css.body}
					dangerouslySetInnerHTML={{ __html: poll.body }}
				/>
			</div>
			<PollState state={poll.state} />
		</div>
	);
}
