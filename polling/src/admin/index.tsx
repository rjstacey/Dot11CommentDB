import CreateEventDropdown from "./createEvent";
import EventTabsList from "./eventsList";
import EventPanel from "./eventPanel";
import css from "./admin.module.css";

function Admin() {
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
		</div>
	);
}

export default Admin;
