import * as React from "react";
import { Dropdown } from "react-bootstrap";

import { useAppSelector } from "@/store/hooks";
import { selectOfflineStatus, selectOfflineOutbox } from "@/store/offline";

import styles from "./OnlineIndicator.module.css";

const Selector = React.forwardRef<
	HTMLDivElement,
	{
		show: boolean;
		setShow: (show: boolean) => void;
	}
>(function SelectorWithRef(props, ref) {
	const { show, setShow } = props;
	const status = useAppSelector(selectOfflineStatus);
	let color = "#ff4e4e";
	if (status === "online") color = "#bbff4e";
	if (status === "unreachable") color = "#ffb04e";
	const background = `radial-gradient(circle at 5px 5px, ${color}, #000000b0)`;

	let onClick: React.MouseEventHandler | undefined;
	if (status !== "online") onClick = () => setShow(!show);

	return (
		<div ref={ref} className={styles.container} onClick={onClick}>
			<div
				className={styles.indicator}
				style={{ background }}
				title={status}
			/>
			{status}
		</div>
	);
});

function Outbox() {
	const outbox = useAppSelector(selectOfflineOutbox);
	const entries = outbox.length
		? outbox.map((o, i) => <span key={i}>{JSON.stringify(o.effect)}</span>)
		: "Empty";

	return <div>{entries}</div>;
}

function SyncIndicator() {
	const [show, setShow] = React.useState(false);
	return (
		<Dropdown show={show}>
			<Dropdown.Toggle as={Selector} show={show} setShow={setShow} />
			<Dropdown.Menu>
				<Outbox />
			</Dropdown.Menu>
		</Dropdown>
	);
}

export default SyncIndicator;
