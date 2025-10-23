import { Container, ButtonGroup, ToggleButton } from "react-bootstrap";
import {
	useLocation,
	useNavigate,
	useNavigation,
	useParams,
} from "react-router";
import { GroupSelector, SubgroupSelector } from "./GroupSelector";
import { AccessLevel } from "@common";
import { useAppSelector } from "@/store/hooks";
import { selectTopLevelGroup, selectSelectedGroup } from "@/store/groups";
import { AccountDropdown } from "./AccountDropdown";

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
		<div>
			<ButtonGroup>
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

	return (
		<Container
			as="header"
			fluid
			className="d-flex flex-row justify-content-between bg-body-tertiary "
		>
			<h3 className="title">{title}</h3>
			<GroupSelector />
			{group && <SubgroupSelector />}
			{access >= AccessLevel.rw ? <ToggleAdminView /> : null}
			<AccountDropdown className="mt-2" />
		</Container>
	);
}

export default Header;
