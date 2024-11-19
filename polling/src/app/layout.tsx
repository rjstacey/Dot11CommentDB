import { Outlet } from "react-router-dom";
import { ErrorModal, ConfirmModal } from "dot11-components";
import Header from "./Header";
import styles from "./app.module.css";
import { useAppSelector } from "../store/hooks";
import { selectSelectedGroup } from "../store/groups";
import GroupSelector from "./GroupSelector";

function Nav() {
	const group = useAppSelector(selectSelectedGroup);
	let title: string;
	if (!group) {
		title = "Group";
	} else {
		title = "Subgroup";
	}

	return (
		<div className={styles.nav}>
			<div className="intro">{title}</div>
			<GroupSelector />
		</div>
	);
}

function AppLayout() {
	return (
		<>
			<Header />
			<main className={styles.body}>
				<Nav />
				<Outlet />
			</main>
			<ErrorModal />
			<ConfirmModal />
		</>
	);
}

export default AppLayout;
