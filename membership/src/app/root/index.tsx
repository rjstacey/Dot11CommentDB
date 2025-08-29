import WorkingGroupSelector from "./WorkingGroupSelector";
import styles from "./root.module.css";

function RootMain() {
	return (
		<div className={styles.root}>
			<h2 className={styles.intro}>Working group/Committee</h2>
			<WorkingGroupSelector />
		</div>
	);
}

export default RootMain;
