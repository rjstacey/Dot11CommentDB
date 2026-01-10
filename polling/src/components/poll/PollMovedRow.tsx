import type { Poll } from "@/store/pollingAdmin";
import MemberShow from "../MemberShow";
import cx from "clsx";
import css from "../poll-layout.module.css";

export function PollMovedRow({
	poll,
	readOnly,
}: {
	poll: Poll;
	readOnly?: boolean;
}) {
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
