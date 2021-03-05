import React from 'react';
import PropTypes from 'prop-types';
import AutoSizer from 'react-virtualized-auto-sizer';
import styled from '@emotion/styled';

import {Icon} from '../general/Icons';

const Constants = {
	X_PADDING: 50,
	LABEL_WIDTH: 50,
	LABEL_HEIGHT: 40,
	MIN_EVENT_PADDING: 65,
	MAX_EVENT_PADDING: 200,
	THREAD_HEIGHT: 15,
	DOT_DIAMETER: 14,
}

/**
 * Differance between two dates
 *
 * @param  {Date} first Date of the first event
 * @param  {Date} second Date of the second event
 * @return {number} Differance between the two dates
 */
const dateDiff = (first, second) => second - first;

/**
 * Given dates and some bounds returns an array of positioning information w.r.t. some origin for
 * that set of dates.
 *
 * @param {dates} array containing dates
 * @return {array} positioning for each date 
 */
const datesToDistance = (dates) => {

	if (dates.length < 1)
		return [];

	const deltas = Array(dates.length-1);
	for (let i = 0; i < deltas.length; i++)
		deltas[i] = dateDiff(dates[i], dates[i+1])

	const deltaMin = Math.min.apply(null, deltas);
	const deltaMax = Math.max.apply(null, deltas);
	const deltaExtremesDiff = deltaMax - deltaMin;
	const distanceExtremesDiff = Constants.MAX_EVENT_PADDING - Constants.MIN_EVENT_PADDING;

	const distances = Array(dates.length);
	distances[0] = Constants.X_PADDING;
	for (let i = 1; i < distances.length; i += 1) {
		distances[i] = distances[i-1] + 
			(deltaExtremesDiff === 0?
				Constants.MIN_EVENT_PADDING:
				Math.max(Math.round((((deltas[i-1] - deltaMin) * distanceExtremesDiff) / deltaExtremesDiff) + Constants.MIN_EVENT_PADDING), Constants.MIN_EVENT_PADDING));
	}

	return distances;
};

/**
 * Convert a date to a string label
 * @param {string} date The string representation of a date
 * @return {string} The formatted date string
 */
const getLabel = (date) => (new Date(date)).toDateString().substring(4);

const EventLabel = styled.div`
	position: absolute;
	text-align: center;
	width: 60px;
	transform: translate(-50%);
`;

const ThreadLabel = styled.div`
	position: absolute;
	top: ${Constants.THREAD_HEIGHT/2}px;
	text-align: roght;
	width: fit-content;
	padding-right: 10px;
	transform: translate(-100%, -50%);
	background-color: rgba(255, 255, 255, 0.6);
`;

const EventDot = styled.div`
	cursor: pointer;
	position: absolute;
	top: ${Constants.THREAD_HEIGHT/2}px;
	height: ${Constants.DOT_DIAMETER}px;
	width: ${Constants.DOT_DIAMETER}px;
	box-sizing: border-box;
	border: 3px solid ${({isPast}) => isPast? 'rgb(123, 157, 111)': '#aaa' };
	border-radius: 50%;
	background-color: ${({isSelected}) => isSelected? 'rgb(123, 157, 111)': '#fff'};
	transition: background-color 0.3s, border-color 0.3s;
	transform: translate(-50%, -50%);
`;

const Line = styled.div`
	position: absolute;
	top: ${Constants.THREAD_HEIGHT/2}px;
	height: 2px;
	box-sizing: border-box;
	background-color: ${({isPast}) => isPast? 'rgb(123, 157, 111)': '#aaa'};
	transition: background-color 0.3s;
	transform: translateY(-50%);
	z-index: -1;
`;

const LabelsContainer = styled.div`
	position: relative;
	height: ${Constants.LABEL_HEIGHT}px;
`;
const ThreadContainer = styled.div`
	position: relative;
	height: ${Constants.THREAD_HEIGHT}px;
`;

function Events({index, events, onClick}) {

	const totalWidth = events.length?
		events[events.length - 1].distance + 2*Constants.X_PADDING:
		2*Constants.X_PADDING;

	const labels = [];
	let threads = new Map();
	events.forEach((e, i) => {
			if (!threads.has(e.threadId))
				threads.set(e.threadId, {elements: [], events: [], label: null});
			const t = threads.get(e.threadId);

			// One label per event
			labels.push(
					<EventLabel
						key={`label-${i}`}
						style={{left: e.distance}}
					>
						{e.label}
					</EventLabel>
				);

			// Label thread with each add
			if (e.type === 'add' || e.threadLabel !== t.label) {
				t.label = e.threadLabel;
				t.elements.push(<ThreadLabel key={i} style={{left: e.distance}}>{e.threadLabel}</ThreadLabel>);
			}

			const isPast = i <= index && e.threadId === events[index].threadId;

			// One dot per event
			t.elements.push(
					<EventDot
						key={`dot-${i}`}
						style={{left: e.distance}}
						isPast={isPast}
						isSelected={i === index}
						onClick={() => onClick(i)}
					/>
				);

			// Lines before the event
			if (t.events.length === 0) {
				if (e.type !== 'add')
				t.elements.push(
						<Line
							key={`${e.threadId}-${i}`}
							isPast={isPast}
							style={{left: e.distance - Constants.X_PADDING, width: Constants.X_PADDING}}
						/>
					);
			}
			else {
				if (e.type !== 'add') {
				const e_prev = t.events[t.events.length-1];
				if (e_prev.type !== 'delete')
					t.elements.push(
							<Line
								key={`${e.threadId}-${i}`}
								isPast={isPast}
								style={{left: e_prev.distance, width: e.distance - e_prev.distance}}
							/>
						);
				else
					t.elements.push(
							<Line
								key={`${e.threadId}-${i}`}
								isPast={isPast}
								style={{left: e.distance - Constants.MIN_EVENT_PADDING, width: Constants.MIN_EVENT_PADDING}}
							/>
						);
				}
			}
			t.events.push(e);
		});

	// Lines after last event
	threads.forEach(t => {
			const e = t.events[t.events.length-1];
			if (e.type !== 'delete')
				t.elements.push(<Line key={`${e.threadId}-continues`} isPast={false} style={{left: e.distance, width: totalWidth - e.distance - Constants.X_PADDING}} />)
		});

	return (
		<React.Fragment>
			<LabelsContainer style={{width: totalWidth}}>
				{labels}
			</LabelsContainer>
			{Array.from(threads).map(([k, t]) => 
				<ThreadContainer key={k} style={{width: totalWidth}}>
					{t.elements}
				</ThreadContainer>
			)}
		</React.Fragment>
	)
}

const ScrollIcon = styled(Icon)`
	font-size: 2em;
	cursor: pointer;
	color: #aaa;
`;

const EventsContainer = styled.div`
	flex: 1;
	overflow: auto;
	margin: 0 20px;
	padding: 2px;
	display: flex;
	flex-direction: column;
`;

const Container = styled.div`
	display: flex;
	flex-wrap: nowrap;
	align-content: space-between;
	align-items: center;
`;

/*
 * Horizontal Timeline
 * Groups events into threads and arranges on a timeline.
 */
function HorizontalTimeline({style, className, index, indexClick, events}) {
	const containerRef = React.useRef();

	const scrollRight = () => {
	if (containerRef.current)
		containerRef.current.scrollLeft += 100;
	}

	const scrollLeft = () => {
	if (containerRef.current)
		containerRef.current.scrollLeft -= 100;
	}

	// Convert the date strings to actual date objects
	const dates = events.map((e) => new Date(e.timestamp));
	// Calculate the distances for all events
	const distances = datesToDistance(dates);
	// Convert the distances and dates to events
	events = events.map((e, i) => ({
		...e,
		distance: distances[i],
		label: getLabel(e.timestamp),
	}));

	return (
		<Container style={style} className={className} >
			<ScrollIcon icon='angle-left' onClick={scrollLeft} />
			<EventsContainer ref={containerRef} >
				<Events 
					index={index}
					onClick={indexClick}
					events={events}
				/>
			</EventsContainer>
			<ScrollIcon icon='angle-right' onClick={scrollRight} />
		</Container>
	)
}

HorizontalTimeline.propTypes = {
	index: PropTypes.number,  // Selected index
	events: PropTypes.arrayOf(PropTypes.object).isRequired, // Array of events
	indexClick: PropTypes.func,   // Function that takes the index of the array as argument
};

export default HorizontalTimeline;
