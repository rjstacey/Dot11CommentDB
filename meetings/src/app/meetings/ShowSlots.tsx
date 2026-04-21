import { useMemo } from "react";
import { DateTime } from "luxon";
import clsx from "clsx";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fromSlotId, selectCurrentSession } from "@/store/sessions";
import { selectSelectedSlots, toggleSelectedSlots } from "@/store/meetings";

const Slot = ({
	children,
	remove,
}: {
	remove?: React.MouseEventHandler;
	children?: React.ReactNode;
}) => (
	<div className="slot" role="listitem">
		{children && <span className="slot-item">{children}</span>}
		<i className="bi-x icon action" onClick={remove} />
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
	const elements = useMemo(() => {
		const elements: React.ReactElement[] = [];
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
				</Slot>,
			);
		});
		return elements;
	}, [slots, session, dispatch]);

	return (
		<div style={style} className={clsx("show-slots", className)}>
			<div className="label">
				<span>Slots:</span>
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
