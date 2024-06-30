import { useLocation, useParams } from "react-router-dom";
import { selectWorkingGroupByName } from "../store/groups";
import { useAppSelector } from "../store/hooks";
import styles from "./app.module.css";

function Tool({
	href,
	name,
	description,
}: {
	href: string;
	name: string;
	description: string;
}) {
	return (
		<>
			<div>
				<a href={href}>{name}</a>
			</div>
			<div>{description}</div>
		</>
	);
}
function Tools() {
	const location = useLocation();
	const { groupName } = useParams();
	const group = useAppSelector((state) =>
		selectWorkingGroupByName(state, groupName!)
	);

	const showCommentResolution = (group?.permissions.comments || 0) >= 0;
	const showMembership = (group?.permissions.members || 0) >= 0;
	const showMeetings = (group?.permissions.meetings || 0) >= 0;

	const tools: JSX.Element[] = [];
	if (showCommentResolution) {
		console.log("/comments" + location.pathname);
		tools.push(
			<Tool
				key="cr"
				href={"/comments" + location.pathname}
				name="Comment resolution"
				description="Managing ballots, view ballot results and develop comment resolutions"
			/>
		);
	}

	if (showMembership) {
		tools.push(
			<Tool
				key="mem"
				href={"/membership" + location.pathname}
				name="Membership"
				description="Manage group membership"
			/>
		);
	}

	if (showMeetings) {
		tools.push(
			<Tool
				key="mtg"
				href={"/meetings" + location.pathname}
				name="Meetings"
				description="Schedule session and teleconference meetings"
			/>
		);
	}

	if (tools.length === 0) {
		return <p>You do not have access to any tools</p>;
	}

	return (
		<>
			<p>Tools available to you</p>
			<div className={styles.tools}>{tools}</div>
		</>
	);
}

export default Tools;
