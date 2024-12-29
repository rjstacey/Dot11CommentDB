import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";

import { Account, Button } from "dot11-components";
import Toggle from "../components/toggle";
import { resetStore } from "../store";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { AccessLevel, selectUser, setUser } from "../store/user";

import pkg from "../../package.json";

import styles from "./app.module.css";
import { selectSelectedGroup } from "src/store/groups";

const viewOptions = [
	{ value: true, label: "Admin" },
	{ value: false, label: "User" },
];
function ToggleAdminView() {
	const [searchParams, setSearchParams] = useSearchParams();
	const isAdmin = searchParams.get("isAdmin") === "true";
	function setIsAdmin(isAdmin: boolean) {
		setSearchParams((params) => {
			if (isAdmin) params.set("isAdmin", "true");
			else params.delete("isAdmin");
			return params;
		});
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
