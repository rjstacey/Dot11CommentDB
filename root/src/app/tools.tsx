import { useLocation, useParams } from "react-router";
import { Container, Nav, Row, Col } from "react-bootstrap";
import { selectTopLevelGroupByName } from "../store/groups";
import { useAppSelector } from "../store/hooks";

type MenuEntry = {
	href: string;
	name: string;
	description: string;
};

function Tools() {
	const location = useLocation();
	const { groupName } = useParams();
	const group = useAppSelector((state) =>
		selectTopLevelGroupByName(state, groupName!)
	);

	const showCommentResolution = (group?.permissions.comments || 0) >= 1;
	const showMembership = (group?.permissions.members || 0) >= 1;
	const showMeetings = (group?.permissions.meetings || 0) >= 1;
	const showPolling = (group?.permissions.polling || 0) >= 1;

	const tools: MenuEntry[] = [];
	if (showCommentResolution) {
		tools.push({
			href: "/comments" + location.pathname,
			name: "Comment resolution",
			description:
				"Managing ballots, view ballot results and develop comment resolutions",
		});
	}

	if (showMembership) {
		tools.push({
			href: "/membership" + location.pathname,
			name: "Membership",
			description: "Manage group membership",
		});
	}

	if (showMeetings) {
		tools.push({
			href: "/meetings" + location.pathname,
			name: "Meetings",
			description: "Schedule session and teleconference meetings",
		});
	}

	if (showPolling) {
		tools.push({
			href: "/polling" + location.pathname,
			name: "Polling",
			description: "Motions and strawpoll",
		});
	}

	if (tools.length === 0) {
		return (
			<Container>
				<h2>You do not have access to any tools</h2>
			</Container>
		);
	}

	return (
		<Container as="section">
			<h2>Tools available to you</h2>
			<Nav variant="underline" className="flex-column">
				{tools.map((tool) => (
					<Row key={tool.href} className="mb-1">
						<Col xs={12} sm={8} md={6} lg={4}>
							<Nav.Item>
								<Nav.Link href={tool.href}>
									{tool.name}
								</Nav.Link>
							</Nav.Item>
						</Col>
						<Col xs={12} className="d-flex justify-items-center">
							<p>{tool.description}</p>
						</Col>
					</Row>
				))}
			</Nav>
		</Container>
	);
}

export default Tools;
