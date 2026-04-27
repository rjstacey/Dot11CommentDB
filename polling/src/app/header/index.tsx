import { Container, Navbar } from "react-bootstrap";
import { GroupSelector, SubgroupSelector } from "./GroupSelector";
import { useAppSelector } from "@/store/hooks";
import {
	selectTopLevelGroup,
	selectSelectedGroup,
	AccessLevel,
} from "@/store/groups";
import { Breadcrumbs } from "./Breadcrumbs";
import { MemberCount } from "./MemberCount";
import { ToggleAdminView } from "./ToggleAdminView";
import { AccountDropdown } from "./AccountDropdown";

import "./header.css";

function Header() {
	const group = useAppSelector(selectTopLevelGroup);
	const subgroup = useAppSelector(selectSelectedGroup);
	const access = subgroup?.permissions.polling || AccessLevel.none;

	return (
		<Container as="header" fluid className="bg-body-tertiary">
			<Navbar className="menu-navbar">
				<Breadcrumbs />
				<GroupSelector />
				{group && <SubgroupSelector />}
			</Navbar>
			{access >= AccessLevel.rw && (
				<>
					<MemberCount />
					<ToggleAdminView />
				</>
			)}
			<AccountDropdown />
		</Container>
	);
}

export default Header;
