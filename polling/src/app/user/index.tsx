import React from "react";
import { Tabs, Tab } from "react-bootstrap";
import { useAppSelector } from "@/store/hooks";
import { PollsList } from "./pollsList";
import { CurrentPoll } from "./currentPoll";
import { selectPollingUserActivePoll } from "@/store/pollingUser";
import cx from "clsx";
import "./user.css";

function PollUser() {
	const hasActivePoll = Boolean(useAppSelector(selectPollingUserActivePoll));

	const currentPollTitle = (
		<span className={cx(hasActivePoll && "active-poll")}>
			{"Current Poll"}
		</span>
	);

	return (
		<div className="user-content">
			<Tabs id="user-tabs" defaultActiveKey="0">
				<Tab eventKey="0" title={currentPollTitle}>
					<CurrentPoll />
				</Tab>
				<Tab eventKey="1" title="All Polls">
					<PollsList />
				</Tab>
			</Tabs>
		</div>
	);
}

export default PollUser;
