import * as React from "react";
import { DateTime } from "luxon";

import { ActionIcon } from "dot11-components";

import { useAppDispatch, useAppSelector } from "../store/hooks";
import { fromSlotId, selectCurrentSession } from "../store/sessions";
import { selectSelectedSlots, toggleSelectedSlots } from "../store/meetings";

import styles from "./meetings.module.css";

const Slot = ({
	children,
	remove,
}: {
	remove?: React.MouseEventHandler;
	children?: React.ReactNode;
}) => (
	<div className={styles.slot} role="listitem">
		{children && <span className={styles["slot-item"]}>{children}</span>}
		<ActionIcon style={{ minWidth: 16 }} type="clear" onClick={remove} />
	</div>
);

function ShowSelectedSlots({
	style,
	className,
}: {
	style?: React.CSSProperties;
	className?: string;
}) {
	const dispatch = useAppDispatch();
	const slots = useAppSelector(selectSelectedSlots);
	const session = useAppSelector(selectCurrentSession);
	const elements = React.useMemo(() => {
		const elements: JSX.Element[] = [];
		slots.forEach((s) => {
			const [date, slotId, roomId] = fromSlotId(s || "");
			const weekday = DateTime.fromISO(date).weekdayShort!;
			const slotName =
				session?.timeslots.find((slot) => slot.id === slotId)?.name ||
				"?";
			const roomName =
				session?.rooms.find((room) => room.id === roomId)?.name || "?";
			elements.push(
				<Slot key={s} remove={() => dispatch(toggleSelectedSlots([s]))}>
					{`${weekday} ${slotName} ${roomName}`}
				</Slot>
			);
		});
		return elements;
	}, [slots, session, dispatch]);

	return (
		<div
			style={style}
			className={
				styles["show-slots"] + (className ? " " + className : "")
			}
		>
			<div className="label">
				<label>Slots:</label>
				<span>{elements.length}</span>
			</div>
			<div className="content">
				{elements.length ? (
					elements
				) : (
					<span className="placeholder">No slots selected</span>
				)}
			</div>
		</div>
	);
}

export default ShowSelectedSlots;
