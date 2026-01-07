import { Container, ButtonGroup, ToggleButton } from "react-bootstrap";
import {
	useLocation,
	useNavigate,
	useNavigation,
	useParams,
} from "react-router";
import { GroupSelector, SubgroupSelector } from "./GroupSelector";
import { useAppSelector } from "@/store/hooks";
import {
	selectTopLevelGroup,
	selectSelectedGroup,
	AccessLevel,
} from "@/store/groups";
import { selectPollingAdminVoted } from "@/store/pollingAdmin";
import { AccountDropdown } from "./AccountDropdown";
import React from "react";

function ToggleAdminView() {
	const location = useLocation();
	const navigate = useNavigate();
	const navigation = useNavigation();

	const isAdmin = location.pathname.endsWith("/admin");
	function setIsAdmin(isAdmin: boolean) {
		let path = location.pathname.replace("/admin", "");
		if (isAdmin) path += "/admin";
		navigate(path);
	}

	return (
		<ButtonGroup className="align-items-center ms-3 me-3">
			<ToggleButton
				type="radio"
				id="toggle-admin"
				value="admin"
				variant={"outline-danger"}
				checked={isAdmin}
				onChange={(e) => setIsAdmin(e.target.checked)}
				disabled={navigation.state === "loading"}
			>
				{"Admin"}
			</ToggleButton>
			<ToggleButton
				type="radio"
				id="toggle-user"
				value="user"
				variant={"outline-success"}
				checked={!isAdmin}
				onChange={(e) => setIsAdmin(!e.target.checked)}
				disabled={navigation.state === "loading"}
			>
				{"User"}
			</ToggleButton>
		</ButtonGroup>
	);
}

function MemberCount() {
	const voted = useAppSelector(selectPollingAdminVoted);

	return (
		<div className="d-flex gap-2">
			<span className="bi-people">{voted.numMembers}</span>
		</div>
	);
}

function Header() {
	const { groupName } = useParams();

	const title = (groupName ? groupName + " " : "") + "Polling";
	if (document.title !== title) document.title = title;

	const group = useAppSelector(selectTopLevelGroup);
	const subgroup = useAppSelector(selectSelectedGroup);
	const access = subgroup?.permissions.polling || AccessLevel.none;

	let adminElements: React.ReactNode = null;
	if (access >= AccessLevel.rw) {
		adminElements = (
			<>
				<MemberCount />
				<ToggleAdminView />
			</>
		);
	}

	return (
		<Container
			as="header"
			fluid
			className="d-flex flex-row justify-content-between align-items-center bg-body-tertiary "
		>
			<h3 className="title">{title}</h3>
			<GroupSelector />
			{group && <SubgroupSelector />}
			{adminElements}
			<AccountDropdown />
		</Container>
	);
}

export default Header;
