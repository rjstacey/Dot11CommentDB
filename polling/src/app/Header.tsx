import { useLocation, useNavigate, useParams } from "react-router";

import { Account, Button } from "dot11-components";
import Toggle from "@/components/toggle";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { resetStore } from "@/store";
import { selectTopLevelGroup, selectSelectedGroup } from "@/store/groups";
import { AccessLevel, selectUser, setUser } from "@/store/user";
import { GroupSelector, SubgroupSelector } from "./GroupSelector";

import pkg from "../../package.json";

import css from "./app.module.css";

const viewOptions = [
	{ value: true, label: "Admin" },
	{ value: false, label: "User" },
];

function ToggleAdminView() {
	const location = useLocation();
	const navigate = useNavigate();

	const isAdmin = location.pathname.endsWith("/admin");
	function setIsAdmin(isAdmin: boolean) {
		let path = location.pathname.replace("/admin", "");
		if (isAdmin) path += "/admin";
		navigate(path);
	}

	return (
		<Toggle
			label="View:"
			options={viewOptions}
			value={isAdmin}
			onChange={setIsAdmin}
		/>
	);
}

function Header() {
	const dispatch = useAppDispatch();
	const { groupName } = useParams();
	const user = useAppSelector(selectUser);

	const clearCache = () => {
		dispatch(resetStore());
		dispatch(setUser(user));
	};

	const title = (groupName ? groupName + " " : "") + "Polling";
	if (document.title !== title) document.title = title;

	//const rootPath = "/" + (groupName || "");

	const group = useAppSelector(selectTopLevelGroup);
	const subgroup = useAppSelector(selectSelectedGroup);
	const access = subgroup?.permissions.polling || AccessLevel.none;

	return (
		<header className={css.header}>
			<div
				style={{
					width: "100%",
					display: "flex",
					justifyContent: "space-between",
				}}
			>
				<h3 className={css.title}>Polling</h3>
				<Account user={user}>
					<div>
						{pkg.name}: {pkg.version}
					</div>
					<Button onClick={clearCache}>Clear cache</Button>
				</Account>
			</div>
			<div
				style={{
					width: "100%",
					display: "flex",
					justifyContent: "space-between",
				}}
			>
				<div
					style={{
						width: "100%",
						display: "flex",
					}}
				>
					<GroupSelector />
					{group && <SubgroupSelector />}
				</div>
				{access >= AccessLevel.rw ? <ToggleAdminView /> : null}
			</div>
		</header>
	);
}

export default Header;
