import { Outlet } from "react-router-dom";
import { ErrorModal, ConfirmModal } from "dot11-components";
import { useAppSelector } from "@/store/hooks";
import { selectSelectedGroup } from "@/store/groups";
import GroupSelector from "./GroupSelector";
import Header from "./Header";

import css from "./app.module.css";

function Nav() {
	const group = useAppSelector(selectSelectedGroup);
	let title: string;
	if (!group) {
		title = "Group";
	} else {
		title = "Subgroup";
	}

	return (
		<div className={css.nav}>
			<div className="intro">{title}</div>
			<GroupSelector />
		</div>
	);
}

function AppLayout() {
	return (
		<>
			<Header />
			<main className={css.body}>
				<Nav />
				<Outlet />
			</main>
			<ErrorModal />
			<ConfirmModal />
		</>
	);
}

export default AppLayout;
