import React from "react";
import EventPanel from "./allPolls";
import CurrentPoll from "./currentPoll";
import cx from "classnames";
import css from "./tabs.module.css";

function PollUser() {
	const [index, setIndex] = React.useState(0);

	return (
		<div className={css.tabs}>
			<div className={css.tabList}>
				<div
					className={cx({ [css.tab]: true, selected: index === 0 })}
					onClick={() => setIndex(0)}
				>
					Current Poll
				</div>
				<div
					className={cx({ [css.tab]: true, selected: index === 1 })}
					onClick={() => setIndex(1)}
				>
					Upcoming Polls
				</div>
			</div>
			<div className={css.tabPanel + (index === 0 ? " selected" : "")}>
				<CurrentPoll />
			</div>
			<div className={css.tabPanel + (index === 1 ? " selected" : "")}>
				<EventPanel />
			</div>
		</div>
	);
}

export default PollUser;
