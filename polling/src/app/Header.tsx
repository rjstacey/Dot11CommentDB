import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";

import { Account, Button } from "dot11-components";
import Toggle from "@/components/toggle";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { resetStore } from "@/store";
import { selectSelectedGroup } from "@/store/groups";
import { AccessLevel, selectUser, setUser } from "@/store/user";

import pkg from "../../package.json";

import styles from "./app.module.css";

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
	const navigate = useNavigate();
	const { groupName } = useParams();
	const user = useAppSelector(selectUser)!;
	const group = useAppSelector(selectSelectedGroup);
	const access = group?.permissions.polling || AccessLevel.none;

	const clearCache = () => {
		dispatch(resetStore());
		dispatch(setUser(user));
	};

	const title = (groupName ? groupName + " " : "") + "Polling";
	const rootPath = "/" + (groupName || "");

	return (
		<header className={styles.header}>
			<Helmet title={title} />

			<h3 className="title" onClick={() => navigate(rootPath)}>
				{title}
			</h3>

			{access >= AccessLevel.rw ? <ToggleAdminView /> : null}

			<Account user={user}>
				<div>
					{pkg.name}: {pkg.version}
				</div>
				<Button onClick={clearCache}>Clear cache</Button>
			</Account>
		</header>
	);
}

export default Header;
