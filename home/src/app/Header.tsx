import { useParams, NavLink } from "react-router";
import { Container, Button, Nav } from "react-bootstrap";
import { useAppSelector } from "../store/hooks";
import { selectUser } from "../store/user";
import { AccountDropdown } from "./AccountDropdown";
import { loginAndReturn } from "@components/lib";

function SignIn() {
	return <Button onClick={loginAndReturn}>Sign In</Button>;
}

function Header() {
	const { groupName } = useParams();
	const user = useAppSelector(selectUser);

	const title = "802 tools";
	if (document.title !== title) document.title = title;

	const rootPath = "/" + (groupName || "");

	return (
		<>
			<Container
				as="header"
				className={"d-flex justify-content-between bg-body-tertiary"}
			>
				<Nav.Link as={NavLink} to={rootPath}>
					<h2>{title}</h2>
				</Nav.Link>

				{user.SAPIN ? <AccountDropdown /> : <SignIn />}
			</Container>
			<Container>
				<p>
					Tools used by the IEEE 802 LAN/MAN standards committee and
					its subsidiary groups to support their mission.
				</p>
			</Container>
		</>
	);
}

export default Header;
