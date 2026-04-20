import { Dropdown } from "react-bootstrap";
import clsx from "clsx";
import { useAppSelector } from "@/store/hooks";
import { selectOfflineStatus, selectOfflineOutbox } from "@/store/offline";

import "./OnlineIndicator.css";

export function OnlineIndicator() {
	const status = useAppSelector(selectOfflineStatus);
	const outbox = useAppSelector(selectOfflineOutbox);

	return (
		<Dropdown className="online-indicator">
			<Dropdown.Toggle
				className={clsx(status, outbox.length === 0 && "empty")}
				title={status}
				disabled={outbox.length === 0}
			>
				<div className="toggle-content">
					<i className="indicator-sphere" />
					{status}
				</div>
			</Dropdown.Toggle>
			<Dropdown.Menu>
				{outbox.map((o, i) => (
					<Dropdown.Item key={i}>
						{JSON.stringify(o.effect)}
					</Dropdown.Item>
				))}
			</Dropdown.Menu>
		</Dropdown>
	);
}
