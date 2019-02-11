import React from 'react';
import Modal from 'react-modal';
import update from 'immutability-helper';
import {connect} from 'react-redux';
import {Column, Table} from 'react-virtualized';
import {setVotersFilter, setVotersSort, getVoters, deleteVoters, addVoter} from './actions/voters'
import {sortClick, allSelected, toggleVisible, SortIndicator} from './filter'
import styles from './AppTable.css'
import "react-datepicker/dist/react-datepicker.css";

class AddVoterModal extends React.PureComponent {
	constructor(props) {
		super(props);
		this.state = {
			voter: {SAPIN: 0, Name: '', Email: ''}
		}
	}
	change = (e) => {
		this.setState({voter: Object.assign({}, this.state.voter, {[e.target.name]: e.target.value})});
	}
	submit = (e) => {
		this.props.dispatch(addVoter({
			VotingPoolID: this.props.votingPool.VotingPoolID,
			...this.state.voter
		}));
		this.props.close()
	}
	render() {
		return (
			<Modal
				className='ModalContent'
				overlayClassName='ModalOverlay'
				isOpen={this.props.isOpen}
				appElement={this.props.appElement}
			>
				<p>Add voter to voting pool {this.props.votingPool.Name}</p>
				<label>SA PIN:<input type='text' name='SAPIN' value={this.state.voter.SAPIN} onChange={this.change}/></label><br />
				<label>Name:<input type='text' name='Name' value={this.state.voter.Name} onChange={this.change}/></label><br />
				<label>Email:<input type='text' name='Email' value={this.state.voter.Email} onChange={this.change}/></label><br />
				<button onClick={this.submit}>OK</button>
				<button onClick={this.props.close}>Cancel</button>
			</Modal>
		)
	}
}
class Voters extends React.PureComponent {
	constructor(props) {
		super(props);

		this.columns = [
			{dataKey: '',				width: 40,  label: '',
				sortable: false,
				headerRenderer: this.renderHeaderCheckbox,
				cellRenderer: this.renderCheckbox},
			{dataKey: 'SAPIN',	width: 100, label: 'SA PIN'},
			{dataKey: 'Name',			width: 200, label: 'Name'},
			{dataKey: 'Email',			width: 200, label: 'Email'}
		];

		this.state = {
			height: 100,
			width: 100,
			selectedRows: [],
			showVotersImport: false,
			showAddVoter: false,
			showVoters: false
		}

		// List of filterable columns
    	const filterable = ['SAPIN', 'Name', 'Email'];
		if (Object.keys(props.filters).length === 0) {
			filterable.forEach(dataKey => {
				this.props.dispatch(setVotersFilter(dataKey, ''));
			});
		}
		this.sortable = ['SAPIN', 'Name', 'Email'];

		this.lastRenderedWidth = this.state.width;
	}

	componentDidMount() {
		var wrapper = document.getElementById('Voters');
		this.setState({height: wrapper.offsetHeight - 19, width: wrapper.offsetWidth})
		if (!this.props.votersValid || this.props.votingPool.VotingPoolID !== this.props.votingPoolId) {
			this.props.dispatch(getVoters(this.props.votingPool.VotingPoolID))
		}
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
				<SortIndicator sortDirection={sortDirection} />
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
				style={{width: '100%'}}
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
		if (this.lastRenderedWidth !== this.state.width) {
			this.lastRenderedWidth = this.state.width
		}

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
			<div id='Voters' style={{height: '100%'}}>
				<label>Voting Pool:<span>{this.props.votingPool.Name}</span></label>
				<label>Date:<span>{this.props.votingPool.Date.slice(0, 10)}</span></label><br/>
				<button onClick={this.props.close}>Back</button>
				<button onClick={this.handleRemoveSelected}>Remove Selected</button>
				<button onClick={() => this.setState({showAddVoter: true})}>Add</button>

				{this.renderTable()}

				<AddVoterModal
					isOpen={this.state.showAddVoter}
					close={() => this.setState({showAddVoter: false})}
					votingPool={this.props.votingPool}
					dispatch={this.props.dispatch}
					appElement={document.querySelector('#Voters')}
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
		votingPoolId: voters.votingPoolId,
		votersData: voters.votersData,
		votersDataMap: voters.votersDataMap,
		getVoters: voters.getVoters,
		errorMsg: voters.errorMsgs.length? voters.errorMsgs[0]: null,
	}
}
export default connect(mapStateToProps)(Voters);