import React from "react";
import { useAppSelector } from "../store/hooks";
import { selectUser } from "../store/user";
import WorkingGroupSelector from "./WorkingGroupSelector";

import styles from "./app.module.css";

function Root({ children }: React.PropsWithChildren) {
	const user = useAppSelector(selectUser);
	let mainEl: JSX.Element | undefined;
	if (!user.SAPIN) {
		mainEl = (
			<>
				<p>
					If you are a member of IEEE 802 or one of its subgroups,
					then sign in using your IEEE credentials.
				</p>
			</>
		);
	} else {
		mainEl = (
			<>
				<p className="intro">Select a working group/committee</p>
				<WorkingGroupSelector />
			</>
		);
	}
	return (
		<div className={styles.root}>
			<section>
				<p>
					Tools used by the IEEE 802 LAN/MAN standards committee and
					its subsidiary groups to support their mission.
				</p>
			</section>
			<section>{mainEl}</section>
			{children}
		</div>
	);
}

export default Root;
