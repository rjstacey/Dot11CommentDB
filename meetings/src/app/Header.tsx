import { useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";

import { Account, Button } from "dot11-components";

import { resetStore } from "../store";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { setUser, selectUser } from "../store/user";

import Menu from "./menu";

import pkg from "../../package.json";

import styles from "./app.module.css";

function Header() {
	const dispatch = useAppDispatch();
	const navigate = useNavigate();
	const { groupName } = useParams();
	const user = useAppSelector(selectUser)!;

	const title = (groupName ? groupName + " " : "") + "Meetings";
	const rootPath = "/" + (groupName || "");

	const clearCache = () => {
		dispatch(resetStore());
		dispatch(setUser(user));
	};

	return (
		<header className={styles.header}>
			<Helmet title={title} />

			<h3 className="title" onClick={() => navigate(rootPath)}>
				{title}
			</h3>

			<Menu />

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
