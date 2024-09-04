import WorkingGroupSelector from "./WorkingGroupSelector";

import styles from "./app.module.css";

function RootMain() {
	return (
		<div className={styles.root}>
			<div className="intro">Working group/Committee</div>
			<WorkingGroupSelector />
		</div>
	);
}

export default RootMain;
