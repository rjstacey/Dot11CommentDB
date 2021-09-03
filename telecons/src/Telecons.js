import PropTypes from 'prop-types'
import React from 'react'
import {connect, useDispatch} from 'react-redux'
import styled from '@emotion/styled'
import Calendar from './calendar'
import TextArea from 'react-expanding-textarea'
import {Form, List, ListItem, Input, Row, Col, Checkbox} from 'dot11-components/general/Form'
import {ActionIcon, Button} from 'dot11-components/icons'
import Dropdown from 'dot11-components/general/Dropdown'
import {parseNumber, displayDate, displayTime} from 'dot11-components/lib'
import {ConfirmModal} from 'dot11-components/modals'
import {setError} from 'dot11-components/store/error'
import {loadTelecons} from './store/telecons'

function timeToStr(time) {
	if (!time)
		return '';
	return ('0' + time.HH).substr(0,2) + ':' + ('0' + time.MM).substr(0,2);
}

function TimeInput({style, defaultValue, onChange, ...otherProps}) {
	const [value, setValue] = React.useState(timeToStr(defaultValue));
	const [valid, setValid] = React.useState(false);

	const handleChange = (e) => {
		const {value} = e.target;
		const [hourStr, minStr] = value.split(':');

		let isValid = false;
		let time = null;
		if (hourStr && minStr) {
			time = {
				HH: parseNumber(hourStr),
				MM: parseNumber(minStr)
			};
			if (time.HH >= 0 && time.HH < 24 && time.MM >= 0 && time.MM < 60)
				isValid = true;
		}
		else if (!hourStr && !minStr) {
			isValid = true;
		}

		setValid(isValid);
		setValue(value);

		if (onChange)
			onChange(isValid? time: null);
	}

	const newStyle = {...style, color: valid? 'inherit': 'red'}
	return <Input type='search' style={newStyle} {...otherProps} value={value} onChange={handleChange} placeholder="HH:MM" />
}


const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

const InputDatesWrapper = styled.div`
	display: flex;
	align-items: center;
	border: solid 1px #ddd;
	background-color: #fafafa;
	box-sizing: border-box;
	border-radius: 3px;
	line-height: 25px;
	padding: 0 5px;

	.clear {
		visibility: hidden;
		margin: 0 5px;
	}

	.calendar {
		margin: 0 5px;
	}

	:hover .clear.active,
	:focus-within .clear.active {
		visibility: visible;
	}

	:focus-within {
		outline: 0;
		box-shadow: 0 0 0 3px rgba(0,116,217,0.2);
	}
	:focus-within,
	:not([disabled]):valid:hover {
		border-color: #0074D9;
	}
	:invalid {
		background-color: #ff000052;
	}
	::placeholder {
		font-style: italic;
	}
`;

const StyledTextArea = styled(TextArea)`
	font-family: inherit;
	border: none;
	resize: none;

	:focus-visible {
		outline: none;
	}
`;

function DatesInput({value: datesArray, onChange: setDatesArray}) {
	const [datesStr, setDatesStr] = React.useState();
	const [focus, setFocus] = React.useState(false);

	const changeDatesStr = (str) => {
		const datesArray = [];
		const now = new Date();
		let currentMonth = now.getMonth();
		let currentYear = now.getFullYear();
		const strArray = str.split(',');
		for (let s of strArray) {
			let date = null;
			s = s.trim();
			const matches = s.match(/([a-z]*)\s*([\d]+)/i);
			if (matches) {
				const monthStr = matches[1];
				const dayStr = matches[2];
				if (monthStr) {
					currentMonth = months.indexOf(monthStr.substr(0,3).toLowerCase());
					if (currentMonth < now.getMonth())
						currentYear = now.getFullYear() + 1;
				}
				if (currentMonth >= 0 && dayStr)
					date = new Date(currentYear, currentMonth, dayStr);
			}
			if (date)
				datesArray.push(date);
		}
		setDatesArray(datesArray);
		setDatesStr(str);
	}

	const changeDatesArray = (array) => {
		const now = new Date();
		let currentMonth = now.getMonth();
		const dates = array.slice().sort((a, b) => a - b);
		const list = [];
		for (const date of dates) {
			let s = '';
			const month = Intl.DateTimeFormat('en-US', {month: 'short'}).format(date);
			if (month !== currentMonth) {
				s += month;
				currentMonth = month;
			}
			const day = date.getDate();
			s += ' ' + day;
			list.push(s);
		}
		setDatesStr(list.join(', '));
		setDatesArray(dates);
	}

	const today = new Date();
	const minDate = new Date(today.getFullYear(), today.getMonth(), 1);
	const maxDate = new Date(today.getFullYear() + 1, today.getMonth(), 0);

	return (
		<InputDatesWrapper
			onFocus={() => setFocus(true)}
			onBlur={() => setFocus(false)}
		>
			<StyledTextArea
				value={datesStr}
				onChange={(e) => changeDatesStr(e.target.value)}
				placeholder='Enter date(s)...'
			/>
			<ActionIcon
				className={'clear' + (datesStr? ' active': '')}
				type='clear'
				onClick={() => changeDatesArray([])}
			/>
			<Dropdown
				className='calendar'
				selectRenderer={({isOpen, open, close}) =>
					<ActionIcon
						type='calendar'
						title='Select date'
						//disabled={disabled} 
						active={isOpen}
						onClick={isOpen? close: open}
					/>}
				dropdownRenderer={
					() => <Calendar
						multi
						dual
						disablePast
						minDate={minDate}
						maxDate={maxDate}
						value={datesArray}
						onChange={changeDatesArray}
					/>
				}
			/>
		</InputDatesWrapper>
	);
}

const defaultEntry = {
	Dates: [],
	StartTime: null,
	Duration: 1,
	Motions: false,
}

function AddEntry({addEntry}) {
	const [entry, setEntry] = React.useState(defaultEntry);

	const handleAddEntry = async () => {
		let errMsg = '';
		if (entry.Dates.length === 0)
			errMsg = 'Date(s) not set';
		else if (!entry.StartTime)
			errMsg = 'Start time not set'
		else if (!entry.Duration)
			errMsg = 'Duration not set';
		if (errMsg)
			ConfirmModal.show(errMsg, false);
		else
			addEntry(entry);
	};

	return (
		<Row>
			<Col>
				<Label>Dates:</Label>
				<DatesInput
					value={entry.Dates}
					onChange={value => setEntry(state => ({...state, Dates: value}))}
				/>
			</Col>
			<Col>
				<Label>Start time:</Label>
				<TimeInput
					defaultValue={entry.StartTime}
					onChange={value => setEntry(state => ({...state, StartTime: value}))}
				/>
			</Col>
			<Col>
				<Label>Duration:</Label>
				<Input type='search'
					value={entry.Duration || ''}
					onChange={e => setEntry(state => ({...state, Duration: e.target.value}))}
				/>
			</Col>
			<Col>
				<Label>Motions:</Label>
				<Checkbox
					checked={entry.Motions}
					onClick={() => setEntry(state => ({...state, Motions: !state.Motions}))}
				/>
			</Col>
			<Button
				onClick={handleAddEntry}
			>
				Add
			</Button>
		</Row>
	)
}

function displayEntry(entry) {
	return (
		<Row>
			<div>
				{new Intl.DateTimeFormat('en-GB', { dateStyle: 'full', timeStyle: 'long' }).format(entry.Start)}
			</div>
			<div>
				{entry.Duration}
			</div>
			<div>
				{'Motions: ' + (entry.motions? 'yes': 'no')}
			</div>
		</Row>
	)
}

const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const columns = [
	{label: 'Day',
	getValue: entry => days[entry.Start.getDay()]},
	{label: 'Date',
	getValue: entry => displayDate(entry.Start)},
	{label: 'Time',
	getValue: entry => displayTime(entry.Start)},
	{label: 'Duration',
	getValue: entry => entry.Duration},
	{label: 'Motions',
	getValue: entry => entry.Motions}
]

function TeleconTable({entries}) {

	return (
		<table>
			<thead>
				<tr>
					{columns.map(col => <th key={col.label}>{col.label}</th>)}
				</tr>
			</thead>
			<tbody>
				{entries.map(entry => <tr key={entry.Start.toString()}>{columns.map((col, i) => <td key={i}>{col.getValue(entry)}</td>)}</tr>)}
			</tbody>
		</table>
	)
}

const TopRow = styled.div`
	display: flex;
	justify-content: space-between;
	width: 100%;
	padding: 10px;
	box-sizing: border-box;
`;

const Label = styled.div`
	font-weight: bold;
`;

const subgroups = [
	'TGme',
	/*'TGaz',
	'TGbb',
	'TGbc',
	'TGbd',
	'TGbe',
	'TGbh',
	'TGbi',
	'ARC',
	'WNG',
	'AANI',
	'ITU'*/
];

function Subgroup(props) {
	const [entries, setEntries] = React.useState([]);

	const handleAddEntry = (entry) => {
		const newEntries = entry.Dates.map(date => {
			console.log(entry)
			const en = {
				Start: new Date(date.getFullYear(), date.getMonth(), date.getDate(), entry.StartTime.HH, entry.StartTime.MM),
				Duration: entry.Duration,
				Motions: entry.motions
			};
			console.log(en);
			return en;
		})
		setEntries(entries => entries.slice().concat(newEntries));
	}

	return (
		<ListItem>
			<Col>
				<Row>
					<Label>{props.subgroup}</Label>
				</Row>
				<Row>
					<AddEntry
						addEntry={handleAddEntry}
					/>
				</Row>
				<TeleconTable entries={entries} />
			</Col>
		</ListItem>
	)
}

function Telecons({telecons, valid, loading, loadTelecons}) {
	React.useEffect(() => {
		if (!loading)
			loadTelecons();
	}, []);

	return (
		<Form
			title='Telecon schedule'
		>
			<List
				title='Subgroups'
			>
				{subgroups.map(s => <Subgroup key={s} subgroup={s} />)}
			</List>
		</Form>
	)
}

const dataSet = 'telecons';

export default connect(
	(state) => {
		return state[dataSet];
	},
	{loadTelecons}
)(Telecons);
