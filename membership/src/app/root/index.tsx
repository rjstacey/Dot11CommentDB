import WorkingGroupSelector from "./WorkingGroupSelector";
import styles from "./root.module.css";

function RootMain() {
	return (
		<div className={styles.root}>
			<div className="intro">Working group/Committee</div>
			<WorkingGroupSelector />
		</div>
	);
}

export default RootMain;
