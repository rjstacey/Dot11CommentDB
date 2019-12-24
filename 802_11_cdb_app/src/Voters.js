import PropTypes from 'prop-types';
import React, {useState, useEffect, useLayoutEffect} from 'react';
import {useHistory, useParams} from 'react-router-dom'
import {connect} from 'react-redux';
import {setVotersFilters, setVotersSort, getVoters, deleteVoters, addVoter} from './actions/voters'
import {sortClick, filterValidate} from './filter'
import AppTable from './AppTable';
import AppModal from './AppModal';
import "react-datepicker/dist/react-datepicker.css";

function AddVoterModal(props) {
	const defaultVoter = {SAPIN: 0, LastName: '', FirstName: '', MI: '', Email: ''};
	const [voter, setVoter] = useState(defaultVoter);

	function onOpen() {
		setVoter(defaultVoter)
	}

	function change(e) {
		setVoter({...voter, [e.target.name]: e.target.value})
	}

	function submit(e) {
		props.dispatch(addVoter({
			VotingPoolID: props.votingPool.VotingPoolID,
			...voter
		})).then(props.close)
	}

	const style = {
		label: {display: 'inline-block', textAlign: 'left', width: '100px'}
	}
	return (
		<AppModal
			isOpen={props.isOpen}
			onAfterOpen={onOpen}
			onRequestClose={props.close}
		>
			<p>Add voter to voting pool {props.votingPool.Name}</p>
			<label style={style.label}>SA PIN:</label>
				<input style={{width: 100}} type='text' name='SAPIN' value={voter.SAPIN} onChange={change}/><br />
			<label style={style.label}>Last Name:</label>
				<input style={{width: 150}} type='text' name='LastName' value={voter.LastName} onChange={change}/><br />
			<label style={style.label}>First Name:</label>
				<input style={{width: 150}} type='text' name='FirstName' value={voter.FirstName} onChange={change}/><br />
			<label style={style.label}>MI:</label>
				<input style={{width: 50}} type='text' name='MI' value={voter.MI} onChange={change}/><br />
			<label style={style.label}>Email:</label>
				<input style={{width: 250}} type='text' name='Email' value={voter.Email} onChange={change}/><br />
			<p>
				<button onClick={submit}>OK</button>
				<button onClick={props.close}>Cancel</button>
			</p>
		</AppModal>
	)
}
AddVoterModal.propTypes = {
	isOpen: PropTypes.bool.isRequired,
	close: PropTypes.func.isRequired,
	votingPool: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired
}

function Voters(props) {
	const {votingPoolId} = useParams()
	const history = useHistory()

	const columns = [
		{dataKey: 'SAPIN',		label: 'SA PIN',
			sortable: true,
			filterable: true,
			width: 100},
		{dataKey: 'LastName',	label: 'Last Name',
			sortable: true,
			filterable: true,
			width: 150},
		{dataKey: 'FirstName',	label: 'First Name',
			sortable: true,
			filterable: true,
			width: 150},
		{dataKey: 'MI',			label: 'MI',
			sortable: true,
			filterable: true,
			width: 50},
		{dataKey: 'Email',		label: 'Email',
			sortable: true,
			filterable: true,
			width: 250},
		{dataKey: 'Status',		label: 'Status',
			sortable: true,
			filterable: true,
			width: 100}
	];
	const primaryDataKey = columns[0].dataKey

	const [tableHeight, setTableHeight] = useState(400)
	const [tableWidth, setTableWidth] = useState(() => columns.reduce((acc, col) => acc + col.width, 0))
	const [selected, setSelected] = useState([])
	const [showAddVoter, setShowAddVoter] = useState(false)

	useLayoutEffect(() => {
		updateDimensions();
		window.addEventListener("resize", updateDimensions);
		return () => {
			window.removeEventListener("resize", updateDimensions);
		}
	}, [])

	useEffect(() => {
		if (Object.keys(props.filters).length === 0) {
			var filters = {};
			for (let col of columns) {
				if (col.filterable) {
					filters[col.dataKey] = filterValidate(col.dataKey, '')
				}
			}
			props.dispatch(setVotersFilters(filters));
		}
		if (!props.votingPool || props.votingPool.VotingPoolID !== votingPoolId) {
			props.dispatch(getVoters(votingPoolId))
		}
	}, [])

	function updateDimensions() {
		const maxWidth = columns.reduce((acc, col) => acc + col.width, 0)
		const header = document.getElementsByTagName('header')[0]
		const top = document.getElementById('top-row')
		const height = window.innerHeight - header.offsetHeight - top.offsetHeight - 5
		const width = window.innerWidth - 1;
		setTableHeight(height)
		setTableWidth(Math.min(width, maxWidth))
	}

	function close() {
 		history.goBack()
 	}

	function handleRemoveSelected() {
		const data = props.votersData;
		const dataMap = props.votersDataMap;
		var ids = [];
		for (var i = 0; i < dataMap.length; i++) { // only select checked items that are visible
			let id = data[dataMap[i]][primaryDataKey]
			if (selected.includes(id)) {
				ids.push(id)
			}
		}
		if (ids.length) {
			props.dispatch(deleteVoters(ids))
		}
	}

	function sortChange(event, dataKey) {
		const {sortBy, sortDirection} = sortClick(event, dataKey, props.sortBy, props.sortDirection);
		props.dispatch(setVotersSort(sortBy, sortDirection));
		event.preventDefault();
	}

	function filterChange(event, dataKey) {
		var filter = filterValidate(dataKey, event.target.value)
		props.dispatch(setVotersFilters({[dataKey]: filter}));
	}

	return (
		<div id='Voters'>
			{props.votingPool?
				(<div id='top-row'>
				<label>Voting Pool:<span>{props.votingPool.Name}</span></label><br/>
				<button onClick={close}>Back</button>
				<button onClick={handleRemoveSelected}>Remove Selected</button>
				<button onClick={() => setShowAddVoter(true)}>Add</button>
				</div>):
				(<div id='top-row'></div>)
			}
			<AppTable
				hasRowSelector={true}
				hasRowExpander={false}
				columns={columns}
				rowHeight={20}
				height={tableHeight}
				width={tableWidth}
				loading={props.getVoters}
				filters={props.filters}
				sortBy={props.sortBy}
				sortDirection={props.sortDirection}
				sortChange={sortChange}
				filterChange={filterChange}
				//showSelected={() => setShowSelected(true)}
				setSelected={(ids) => setSelected(ids)}
				selected={selected}
				data={props.votersData}
				dataMap={props.votersDataMap}
				primaryDataKey={primaryDataKey}
			/>

			<AddVoterModal
				isOpen={showAddVoter}
				close={() => setShowAddVoter(false)}
				votingPool={props.votingPool}
				dispatch={props.dispatch}
			/>
		</div>
	)
}

function mapStateToProps(state) {
	const {voters} = state;
	return {
		filters: voters.votersFilters,
		sortBy: voters.votersSortBy,
		sortDirection: voters.votersSortDirection,
		votingPool: voters.votingPool,
		votersData: voters.votersData,
		votersDataMap: voters.votersDataMap,
		getVoters: voters.getVoters,
	}
}
export default connect(mapStateToProps)(Voters);