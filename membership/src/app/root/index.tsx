import WorkingGroupSelector from "./WorkingGroupSelector";
import css from "./root.module.css";

export function RootMain() {
	return (
		<div className={css.root}>
			<h2 className={css.intro}>Working group/Committee</h2>
			<WorkingGroupSelector />
		</div>
	);
}
