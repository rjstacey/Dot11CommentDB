import React from "react";
import { useAppSelector } from "@/store/hooks";
import AllPolls from "./allPolls";
import ActivePoll from "./activePoll";
import { selectPollingUserActivePoll } from "@/store/pollingUser";
import cx from "classnames";
import css from "./tabs.module.css";

function PollUser() {
	const hasActivePoll = Boolean(useAppSelector(selectPollingUserActivePoll));
	const [index, setIndex] = React.useState(0);

	return (
		<div className={css.tabs}>
			<div className={css.tabList}>
				<div
					className={cx(css.tab, {
						selected: index === 0,
						active: hasActivePoll,
					})}
					onClick={() => setIndex(0)}
				>
					<>Active Poll</>
				</div>
				<div
					className={cx({ [css.tab]: true, selected: index === 1 })}
					onClick={() => setIndex(1)}
				>
					<>All Polls</>
				</div>
			</div>
			<div className={cx(css.tabPanel, { selected: index === 0 })}>
				<ActivePoll />
			</div>
			<div className={cx(css.tabPanel, { selected: index === 1 })}>
				<AllPolls />
			</div>
		</div>
	);
}

export default PollUser;
