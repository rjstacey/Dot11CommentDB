import { useCallback } from "react";
import { useBeforeUnload } from "react-router";
import CreateEventDropdown from "./createEvent";
import EventTabsList from "./eventsList";
import EventPanel from "./eventPanel";
import PollModal from "./pollModal";
import css from "./admin.module.css";

function Admin() {
	useBeforeUnload(
		useCallback(() => {
			console.log("logging this before navigate!");
		}, [])
	);
	return (
		<div className={css.tabs}>
			<div className={css.header}>
				<EventTabsList />
				<div className={css.filler} />
				<div>
					<CreateEventDropdown />
				</div>
			</div>
			<div className={css.body}>
				<EventPanel />
			</div>
			<PollModal />
		</div>
	);
}

export default Admin;
