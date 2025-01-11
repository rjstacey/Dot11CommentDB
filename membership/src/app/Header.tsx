import { useNavigate, useParams } from "react-router";

import { Account, Button } from "dot11-components";

import NavMenu from "./menu";

import { resetStore } from "@/store";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectUser, setUser } from "@/store/user";

import pkg from "../../package.json";

import styles from "./app.module.css";

function Header() {
	const dispatch = useAppDispatch();
	const navigate = useNavigate();
	const { groupName } = useParams();
	const user = useAppSelector(selectUser)!;

	const clearCache = () => {
		dispatch(resetStore());
		dispatch(setUser(user));
	};

	const title = (groupName ? groupName + " " : "") + "Membership";
	if (document.title !== title) document.title = title;

	const rootPath = "/" + (groupName || "");

	return (
		<header className={styles.header}>
			<h3 className="title" onClick={() => navigate(rootPath)}>
				{title}
			</h3>

			<NavMenu />

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
