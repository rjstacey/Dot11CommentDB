import React from 'react';
import {useSelector} from 'react-redux';
import styled from '@emotion/styled';

import Dropdown from 'dot11-components/dropdown';

import {selectOfflineStatus, selectOfflineOutbox} from '../store/offline';

const Container = styled.div`
	display: flex;
	align-items: center;
`;

const Indicator = styled.div`
	display: block;
	background: black;
	margin: 0 5px;
	border-radius: 50%;
	height: 16px;
	width: 16px;
	background: ${(props) => {
		let color = '#ff4e4e';
		if (props.status === 'online')
			color = '#bbff4e';
		if (props.status === 'unreachable')
			color = '#ffb04e';
		return `radial-gradient(circle at 5px 5px, ${color}, #000000b0);`;
	}}
`;

function Selector({isOpen, open, close}) {
	const status = useSelector(selectOfflineStatus);

	let onClick;
	if (status !== 'online')
		onClick = isOpen? close: open;

	return (
		<Container
			onClick={onClick}
		>
			<Indicator status={status} title={status} />
			{status}
		</Container>
	)
}

function Outbox(props) {
	const outbox = useSelector(selectOfflineOutbox);
	const entries = outbox.length?
		outbox.map((o, i) => <span key={i} >{JSON.stringify(o.effect)}</span>):
		'Empty';

	return (
		<div>
			{entries}
		</div>
	)
}

function SyncIndicator({className}) {
	return (
		<Dropdown
			className={className}
			selectRenderer={(props) => <Selector {...props} />}
			dropdownRenderer={(props) => <Outbox {...props} />}
		/>
	)
}

export default SyncIndicator;

