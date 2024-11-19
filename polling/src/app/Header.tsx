import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";

import { Account, Button } from "dot11-components";

import { resetStore } from "../store";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { selectUser, setUser } from "../store/user";

import pkg from "../../package.json";

import styles from "./app.module.css";

function Header() {
	const dispatch = useAppDispatch();
	const navigate = useNavigate();
	const { groupName, subgroupName } = useParams();
	const user = useAppSelector(selectUser)!;

	const [searchParams, setSearchParams] = useSearchParams();
	const isAdmin = searchParams.get("isAdmin") === "true";
	function toggleIsAdmin() {
		setSearchParams((params) => {
			if (!isAdmin) params.set("isAdmin", "true");
			else params.delete("isAdmin");
			return params;
		});
	}

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

			{subgroupName ? (
				<Button onClick={toggleIsAdmin} isActive={isAdmin}>
					Admin
				</Button>
			) : null}

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
