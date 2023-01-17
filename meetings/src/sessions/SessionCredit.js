import PropTypes from 'prop-types';
import React from 'react';
import {useSelector} from 'react-redux';
import styled from '@emotion/styled';
import {DateTime} from 'luxon';

import {Button} from 'dot11-components/form';

import {selectSessionEntities} from '../store/sessions';

import {RawSessionSelector} from '../components/SessionSelector';

const CreditGrid = styled.div`
	display: grid;
	grid-template-columns: max-content ${({nCol}) => `repeat(${nCol}, minmax(30px, 1fr))`};
	grid-template-rows: max-content ${({nRow}) => `repeat(${nRow}, minmax(30px, 1fr))`};
`;

function GridColumnLabel({style, colIndex, date}) {

	const {weekdayShort, day} = DateTime.fromISO(date);

	return (
		<div style={{...style, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingBottom: 10}}>
			<div style={{textTransform: 'uppercase'}}>
				{weekdayShort}
			</div>
			<div>
				{day}
			</div>
		</div>
	)
}

const GridRowLabel = ({style, rowIndex, label, ...otherProps}) =>
	<div
		style={{...style, display: 'flex', alignItems: 'center'}}
		{...otherProps}
	>
		{label}
	</div>

const GridCell = ({style, rowIndex, colIndex, ...otherProps}) =>
	<div
		style={{...style, display: 'flex', justifyContent: 'center', padding: 5}}
		{...otherProps}
	/>

function sessionDates(session) {
	let dates = [];
	if (session) {
		const start = DateTime.fromISO(session.startDate);
		const end = DateTime.fromISO(session.endDate).plus({days: 1});
		const nDays = end.diff(start, 'days').days;
		if (nDays > 0) {
			dates = new Array(nDays)
				.fill(null)
				.map((d, i) => start.plus({days: i}).toISODate());
		}
	}
	return dates;
}

const creditOptions = ['Normal', 'Extra', 'Zero'];

const defaultCredit = 'Extra';

function validDayCredits(dayCredits, timeslots) {
	return (
		typeof dayCredits === 'object' &&
		Object.keys(dayCredits).length === timeslots.length &&
		Object.keys(dayCredits).every(slotName => timeslots.find(t => slotName === t.name))
	)
}

function defaultDayCredits(timeslots) {
	return timeslots.reduce((dayCredits, t) => ({...dayCredits, [t.name]: defaultCredit}), {});
}

function CreditTotals({defaultCredits}) {

	const totals = creditOptions.reduce((totals, o) => ({
			...totals,
			[o]: defaultCredits.reduce((n, dayCredits) => n + Object.values(dayCredits).reduce((n, credit) => n + (credit === o? 1: 0), 0), 0)
		}), {});

	return (
		<div style={{display: 'flex'}}>
			{Object.entries(totals).map(([label, value]) =>
				<div
					key={label}
					style={{paddingRight: 20}}
				>
					{`${label}: ${value}`}
				</div>
				)}
		</div>
	)
}

const gridCellBackground = {
	Normal: '#cccccc',
	Extra: '#eeeeee',
	Zero: '#ffffff'
}

function CreditButton({credit, style, ...otherProps}) {

	return (
		<Button
			style={{...style, width: '100%', background: gridCellBackground[credit]}}
			{...otherProps}
		>
			{credit}
		</Button>
	)
}

function SessionCredit({
	session,
	updateSession,
	readOnly
}) {
	const entities = useSelector(selectSessionEntities);
	const dates = sessionDates(session);
	const {timeslots, defaultCredits} = session;

	/* Make sure we have a valid defaultCredits array. One that matches dates and timeslots. */
	React.useEffect(() => {
		let s = defaultCredits;
		// Get the length right
		if (!Array.isArray(defaultCredits))
			s = Array(dates.length).fill(defaultDayCredits(timeslots));
		else if (defaultCredits.length < dates.length)
			s = s.concat(Array(dates.length - defaultCredits.length).fill(defaultDayCredits(timeslots)));
		else if (defaultCredits.length > dates.length) {
			s = s.slice();
			s.splice(dates.length);
		}
		// Make sure each entry aligns with timeslots
		if (!s.every(dayCredits => validDayCredits(dayCredits, timeslots)))
			s = s.map(dayCredits => validDayCredits(dayCredits, timeslots)? dayCredits: defaultDayCredits(timeslots));
		if (s !== defaultCredits)
			updateSession({defaultCredits: s});
	}, [defaultCredits, dates, timeslots, updateSession]);

	/* Don't render until we do have a valid one */
	if (!Array.isArray(defaultCredits) ||
		defaultCredits.length !== dates.length ||
		!defaultCredits.every(dayCredits => validDayCredits(dayCredits, timeslots)))
		return null;

	function importDefaultCreditsFromSession(sessionId) {
		const session = entities[sessionId];
		if (!session) {
			console.error('Invalid sessionId=', sessionId);
			return;
		}
		updateSession({defaultCredits: session.defaultCredits});
	}

	function toggleDefaultCredit(day, slotName) {
		let s = defaultCredits.slice();
		let i = creditOptions.indexOf(s[day][slotName]);
		if (i < 0 || ++i >= creditOptions.length)
			i = 0;
		s[day] = {...s[day], [slotName]: creditOptions[i]};
		updateSession({defaultCredits: s});
	}


	return (
		<>
			<div style={{display: 'flex', justifyContent: 'space-between', paddingBottom: 10}}>
				<CreditTotals defaultCredits={defaultCredits} />
				<RawSessionSelector
					onChange={importDefaultCreditsFromSession}
				/>
			</div>
			<CreditGrid nCol={dates.length} nRow={timeslots.length} >
				{dates.map((date, x) =>
					<GridColumnLabel
						key={date}
						style={{gridArea: `1 / ${x+2}`}}
						colIndex={x}
						date={date}
					/>
				)}
				{timeslots.map((timeslot, y) =>
					<GridRowLabel
						key={timeslot.id}
						style={{gridArea: `${y+2} / 1`}}
						rowIndex={y}
						label={timeslot.name}
					/>
				)}
				{dates.map((date, x) => timeslots.map((timeslot, y) =>
					<GridCell
						key={date+timeslot.id}
						style={{gridArea: `${y+2} / ${x+2}`}}
						colIndex={x}
						rowIndex={y}
					>
						<CreditButton
							style={{width: '100%', background: 'transparent'}}
							onClick={() => toggleDefaultCredit(x, timeslot.name)}
							credit={defaultCredits[x][timeslot.name]}
						/>
					</GridCell>
				))}
			</CreditGrid>
		</>
	)
}

SessionCredit.propTypes = {
	session: PropTypes.object.isRequired,
	updateSession: PropTypes.func.isRequired,
	readOnly: PropTypes.bool,
}

export default SessionCredit;
