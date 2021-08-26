import PropTypes from 'prop-types'
import React from 'react'
import {connect} from 'react-redux'
import styled from '@emotion/styled'
import Calendar from './calendar'
import {Form, List, ListItem, Input, TextArea} from 'dot11-components/general/Form'

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

function displayDates(datesArray) {
	if (!Array.isArray(datesArray))
		return '';
	const dates = datesArray.slice().sort((a, b)=> b.date - a.date);
	let currentMonth;
	const list = [];
	for (const d of dates) {
		let s = '';
		const month = Intl.DateTimeFormat('en-US', {month: 'short'}).format(d);
		if (month !== currentMonth) {
			s += month;
			currentMonth = month;
		}
		const day = d.getDate();
		s += ' ' + day;
		list.push(s);
	}
	return list.join(', ');
}

const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

function Subgroup(props) {
	const [datesArray, setDatesArray] = React.useState([]);
	const [datesStr, setDatesStr] = React.useState();

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
		const dates = array.slice().sort((a, b)=> b.date - a.date);
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

	return (
		<ListItem>
			<Label>{props.subgroup}</Label><br />
			<TextArea
				value={datesStr}
				onChange={(e) => changeDatesStr(e.target.value)}
			/><br />
			<Calendar
				isMultiSelector
				disablePast
				value={datesArray}
				onChange={changeDatesArray}
			/>
		</ListItem>
	)
}

function Telecons(props) {
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

export default Telecons;
