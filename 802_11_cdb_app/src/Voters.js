import React from 'react';
import Modal from 'react-modal';
import update from 'immutability-helper';
import {connect} from 'react-redux';
import {Column, Table} from 'react-virtualized';
import {setVotersFilter, setVotersSort, getVoters, deleteVoters, addVoter} from './actions/voters'
import {sortClick, allSelected, toggleVisible} from './filter'
import styles from './AppTable.css'
import "react-datepicker/dist/react-datepicker.css";

class AddVoterModal extends React.PureComponent {
	constructor(props) {
		super(props);
		this.state = {
			voter: {SAPIN: 0, LastName: '', FirstName: '', MI: '', Email: ''}
		}
	}
	change = (e) => {
		this.setState({voter: {...this.state.voter, [e.target.name]: e.target.value}})
	}
	submit = (e) => {
		this.props.dispatch(addVoter({
			VotingPoolID: this.props.votingPool.VotingPoolID,
			...this.state.voter
		})).then(this.props.close)
	}
	render() {
		if (!this.props.votingPool) {
			return null
		}
		const style = {
			label: {display: 'inline-block', textAlign: 'left', width: '100px'}
		}
		return (
			<Modal
				className='ModalContent'
				overlayClassName='ModalOverlay'
				isOpen={this.props.isOpen}
				appElement={this.props.appElement}
			>
				<p>Add voter to voting pool {this.props.votingPool.Name}</p>
				<label style={style.label}>SA PIN:</label>
					<input style={{width: 100}} type='text' name='SAPIN' value={this.state.voter.SAPIN} onChange={this.change}/><br />
				<label style={style.label}>Last Name:</label>
					<input style={{width: 150}} type='text' name='LastName' value={this.state.voter.LastName} onChange={this.change}/><br />
				<label style={style.label}>First Name:</label>
					<input style={{width: 150}} type='text' name='FirstName' value={this.state.voter.FirstName} onChange={this.change}/><br />
				<label style={style.label}>MI:</label>
					<input style={{width: 50}} type='text' name='MI' value={this.state.voter.MI} onChange={this.change}/><br />
				<label style={style.label}>Email:</label>
					<input style={{width: 250}} type='text' name='Email' value={this.state.voter.Email} onChange={this.change}/><br />
				<p>
					<button onClick={this.submit}>OK</button>
					<button onClick={this.props.close}>Cancel</button>
				</p>
			</Modal>
		)
	}
}

class Voters extends React.Component {
	constructor(props) {
		super(props);

		this.columns = [
			{dataKey: '',	label: '',
				width: 40,  
				headerRenderer: this.renderHeaderCheckbox,
				cellRenderer: this.renderCheckbox},
			{dataKey: 'SAPIN',		label: 'SA PIN',		width: 100},
			{dataKey: 'LastName',	label: 'Last Name',		width: 150},
			{dataKey: 'FirstName',	label: 'First Name',	width: 150},
			{dataKey: 'MI',			label: 'MI',			width: 50},
			{dataKey: 'Email',		label: 'Email',			width: 250}
		];

		this.maxWidth = this.columns.reduce((acc, col) => acc + col.width, 0)

		this.state = {
			height: 100,
			width: 100,
			selectedRows: [],
			showVotersImport: false,
			showAddVoter: false,
			showVoters: false
		}

		// List of filterable columns
    	const filterable = ['SAPIN', 'LastName', 'FirstName', 'MI', 'Email'];
		if (Object.keys(props.filters).length === 0) {
			filterable.forEach(dataKey => {
				this.props.dispatch(setVotersFilter(dataKey, ''));
			});
		}
		this.sortable = filterable;
	}

	componentDidMount() {
		this.updateDimensions()
		window.addEventListener("resize", this.updateDimensions);

		const votingPoolId = this.props.match.params.votingPoolId;
		if (!this.props.votingPool || this.props.votingPool.VotingPoolID !== votingPoolId) {
			this.props.dispatch(getVoters(votingPoolId))
		}
	}
	componentWillUnmount() {
		window.removeEventListener("resize", this.updateDimensions);
	}
	updateDimensions = () => {
		var header = document.getElementsByTagName('header')[0]
		var top = document.getElementById('top-row')
		var height = window.innerHeight - header.offsetHeight - top.offsetHeight - 5
		var width = window.innerWidth - 1; //parent.offsetWidth
		//console.log('update ', width, height)
		this.setState({height, width: Math.min(width, this.maxWidth)})
	}

	handleRemoveSelected = () => {
		const data = this.props.votersData;
		const dataMap = this.props.votersDataMap;
		var ids = [];
		for (var i = 0; i < dataMap.length; i++) { // only select checked items that are visible
			let id = data[dataMap[i]].VotingPoolID
			if (this.state.selectedRows.includes(id)) {
				ids.push(id)
			}
		}
		if (ids.length) {
			this.props.dispatch(deleteVoters(ids))
		}
	}
	sortChange = (event, dataKey) => {
		const {sortBy, sortDirection} = sortClick(event, dataKey, this.props.sortBy, this.props.sortDirection);
		this.props.dispatch(setVotersSort(sortBy, sortDirection));
		event.preventDefault();
	}
	filterChange = (event, dataKey) => {
		this.props.dispatch(setVotersFilter(dataKey, event.target.value));
	}

	renderSortLabel = (props) => {
		const {dataKey, label, style} = props;
		const sortDirection = this.props.sortBy.includes(dataKey)? this.props.sortDirection[dataKey]: 'NONE'
		return (
			<span
				key={'label-' + dataKey}
				title={label}
				onClick={e => this.sortChange(e, dataKey)}
				style={{cursor: 'pointer', userSelect: 'none', ...style}}
			>
				{label}
				{sortDirection === 'NONE' || <i className={sortDirection === 'ASC'? "fa fa-sort-alpha-down": "fa fa-sort-alpha-up"} />}
			</span>
		);
	}
	renderLabel = (props) => {
		const {label, style} = props;
		return (
			<span
				key={'label-' + label}
				title={label}
				style={style}
			>
				{label}
			</span>
		);
	}
	renderFilter = (dataKey) => {
		return (
			<input
				key={'filt-' + dataKey}
				type='text'
				className={styles.headerFilt}
				placeholder='Filter'
				onChange={e => this.filterChange(e, dataKey)}
				value={this.props.filters[dataKey]}
				style={{width: 'calc(100% - 10px)'}}
			/>
		);
	}
	renderHeaderCell = ({columnData, dataKey, label}) => {
		const labelElement = this.sortable.includes(dataKey)? this.renderSortLabel({dataKey, label}): this.renderLabel({label});
		const showFilter = this.props.filters.hasOwnProperty(dataKey)
		return (
			<div>
				{labelElement}
				{showFilter && this.renderFilter(dataKey)}
			</div>
		);
	}
	renderHeaderCheckbox = ({dataKey}) => {
		const {selectedRows} = this.state;
		const {votersData, votersDataMap} = this.props;
		const checked = allSelected(selectedRows, votersDataMap, votersData, 'SAPIN');
		return (
			<input
				type="checkbox"
				checked={checked}
				onChange={e => this.setState({selectedRows: toggleVisible(selectedRows, votersDataMap, votersData, 'SAPIN')})}
			/>
		);
	}
	renderCheckbox = ({rowIndex, rowData, dataKey, parent}) => {
		const id = rowData.SAPIN;
		return (
			<input
				type="checkbox"
				checked={this.state.selectedRows.includes(id)}
				onChange={e => {
					// if commentId is present in selectedComments (i > 0) then remove it; otherwise add it
					let i = this.state.selectedRows.indexOf(id);
					this.setState({
						selectedRows: update(this.state.selectedRows, (i > -1)? {$splice: [[i, 1]]}: {$push: [id]})
					})
				}}
			/>
		);
	}

	noRowsRenderer = () => {
		return <div className={styles.noRows}>{this.props.getVoters? 'Loading...': 'No rows'}</div>
	}

	rowClassName = ({index}) => {
		if (index < 0) {
			return styles.headerRow;
		} else {
			return index % 2 === 0 ? styles.evenRow : styles.oddRow;
		}
	}

	renderTable = () => {
		return (
			<Table
				className={styles.Table}
				height={this.state.height}
				width={this.state.width}
				rowHeight={20}
				headerHeight={40}
				noRowsRenderer={this.noRowsRenderer}
				headerClassName={styles.headerColumn}
				rowClassName={this.rowClassName}
				rowCount={this.props.votersDataMap.length}
				rowGetter={({index}) => {return this.props.votersData[this.props.votersDataMap[index]]}}
				onRowDoubleClick={this.showVoters}
			>
				{this.columns.map((col, index) => {
					const {headerRenderer, ...otherProps} = col;
					return (
						<Column 
							key={index}
							columnData={col}
							headerRenderer={headerRenderer? headerRenderer: this.renderHeaderCell}
							{...otherProps}
						/>
				)})}
			</Table>
		)
	}

	render() {
		return (
			<div id='Voters'>
				{this.props.votingPool?
					(<div id='top-row'>
					<label>Voting Pool:<span>{this.props.votingPool.Name}</span></label><br/>
					<button onClick={this.props.close}>Back</button>
					<button onClick={this.handleRemoveSelected}>Remove Selected</button>
					<button onClick={() => this.setState({showAddVoter: true})}>Add</button>
					</div>):
					(<div id='top-row'></div>)
				}

				{this.renderTable()}

				<AddVoterModal
					isOpen={this.state.showAddVoter}
					close={() => this.setState({showAddVoter: false})}
					votingPool={this.props.votingPool}
					dispatch={this.props.dispatch}
					appElement={document.querySelector('#Voters')}
					coulmns={this.columns}
				/>
			</div>
		)
	}
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
		errorMsg: voters.errorMsgs.length? voters.errorMsgs[0]: null,
	}
}
export default connect(mapStateToProps)(Voters);