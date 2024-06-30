import { useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";

import { Account, clearUser, fetcher } from "dot11-components";

import pkg from "../../package.json";

import styles from "./app.module.css";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { selectUser } from "../store/user";
import { resetStore } from "../store";

function Header() {
	const dispatch = useAppDispatch();
	const { groupName } = useParams();
	const user = useAppSelector(selectUser);
	const navigate = useNavigate();

	const title = "802 tools" + (groupName ? " for " + groupName : "");
	const rootPath = "/" + (groupName || "");

	function onSignout() {
		dispatch(resetStore());
		clearUser();
		fetcher.post("/auth/logout");
		navigate("/");
	}

	return (
		<header className={styles.header}>
			<Helmet title={title} />

			<h3 className="title" onClick={() => navigate(rootPath)}>
				{title}
			</h3>

			{user.SAPIN ? (
				<Account user={user} onSignout={onSignout}>
					<div>
						{pkg.name}: {pkg.version}
					</div>
				</Account>
			) : (
				<div style={{ padding: 10 }}>
					<a
						className={styles.signin}
						href={"/login?redirect=" + window.location.pathname}
					>
						Sign in
					</a>
				</div>
			)}
		</header>
	);
}

export default Header;
