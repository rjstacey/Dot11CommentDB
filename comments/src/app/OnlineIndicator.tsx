import * as React from "react";

import { Dropdown, DropdownRendererProps } from "dot11-components";

import { useAppSelector } from "@/store/hooks";
import { selectOfflineStatus, selectOfflineOutbox } from "@/store/offline";

import styles from "./OnlineIndicator.module.css";

function Selector({ state, methods }: DropdownRendererProps) {
	const status = useAppSelector(selectOfflineStatus);
	let color = "#ff4e4e";
	if (status === "online") color = "#bbff4e";
	if (status === "unreachable") color = "#ffb04e";
	const background = `radial-gradient(circle at 5px 5px, ${color}, #000000b0)`;

	let onClick: React.MouseEventHandler | undefined;
	if (status !== "online")
		onClick = state.isOpen ? methods.close : methods.open;

	return (
		<div className={styles.container} onClick={onClick}>
			<div
				className={styles.indicator}
				style={{ background }}
				title={status}
			/>
			{status}
		</div>
	);
}

function Outbox() {
	const outbox = useAppSelector(selectOfflineOutbox);
	const entries = outbox.length
		? outbox.map((o, i) => <span key={i}>{JSON.stringify(o.effect)}</span>)
		: "Empty";

	return <div>{entries}</div>;
}

function SyncIndicator({ className }: { className: string }) {
	return (
		<Dropdown
			className={className}
			selectRenderer={(props) => <Selector {...props} />}
			dropdownRenderer={() => <Outbox />}
		/>
	);
}

export default SyncIndicator;
