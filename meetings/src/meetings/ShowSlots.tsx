import React from 'react';
import styled from '@emotion/styled';
import { DateTime } from 'luxon';
import { useAppDispatch, useAppSelector } from '../store/hooks';

import { ActionIcon } from 'dot11-components';

import { fromSlotId, selectCurrentSession } from '../store/sessions';
import { selectSelectedSlots, toggleSelectedSlots } from '../store/meetings';

const SlotContainer = styled.div`
	display: flex;
	flex-direction: row;
	height: 22px;
	//max-width: 200px;
	margin: 3px 3px 3px 0;
	background: #0074d9;
	color: #fff;
	border-radius: 3px;
	align-items: center;
	:hover {opacity: 0.9}
`;

const SlotItem = styled.span`
	color: #fff;
	line-height: 21px;
	padding: 0 0 0 5px;
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
`;

const Slot = ({
    children,
    remove
}: {
    remove?: (e: MouseEvent) => void;
	children?: React.ReactNode;
}) =>
	<SlotContainer role='listitem'>
		{children && <SlotItem>{children}</SlotItem>}
		<ActionIcon style={{minWidth: 16}} type='clear' onClick={remove} />
	</SlotContainer>


const Container = styled.div`
	display: flex;
	flex-direction: row;
	width: 100%;
    height: 78px;
	padding: 10px;
	box-sizing: border-box;
`;

const Label = styled.div`
    display: flex;
	margin-right: 5px;
	& label {
		font-weight: bold;
        margin-right: 5px;
	}
`;

const Placeholder = styled.span`
	color: #ccc;
	margin-left: 5px;
`;

const Content = styled.div`
	flex: 1;
	display: flex;
	flex-direction: row;
	flex-wrap: wrap;
	align-content: flex-start;
	border: solid 1px #ccc;
	border-radius: 3px;
`;

function ShowSelectedSlots({
    style,
    className
}: {
    style?: React.CSSProperties;
    className?: string;
}) {
    const dispatch = useAppDispatch();
	const slots = useAppSelector(selectSelectedSlots);
	const session = useAppSelector(selectCurrentSession);
	const elements = React.useMemo(() => {
        const elements: JSX.Element[] = [];
        slots.forEach(s => {
            const [date, slotId, roomId] = fromSlotId(s || '');
            const weekday = DateTime.fromISO(date).weekdayShort!;
            const slotName = session?.timeslots.find(slot => slot.id === slotId)?.name || '?';
            const roomName = session?.rooms.find(room => room.id === roomId)?.name || '?';
            elements.push(
                <Slot
                    key={s}
                    remove={() => dispatch(toggleSelectedSlots([s]))}
                >
                    {`${weekday} ${slotName} ${roomName}`}
                </Slot>
            );
		})
        return elements;
    }, [slots, session, dispatch]);

	return (
		<Container
			style={style}
			className={className}
		>
			<Label>
                <label>Slots:</label>
                <span>{elements.length}</span>
            </Label>
			<Content>
				{elements.length? elements: <Placeholder>No slots selected</Placeholder>}
			</Content>
		</Container>
	)
}

export default ShowSelectedSlots;
