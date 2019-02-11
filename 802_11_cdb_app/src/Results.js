import React from 'react';
import {connect} from 'react-redux';
import {Column, Table} from 'react-virtualized';
import BallotSelector from './BallotSelector';
import {setResultsProject, setResultsSort, setResultsFilter, getResults} from './actions/results'
import {sortClick, SortIndicator} from './filter'
import styles from './AppTable.css'


class Results extends React.Component {
	constructor(props) {

		super(props);

		this.columns = [
			{dataKey: '',             width: 40,  label: '',
				sortable: false,
				headerRenderer: this.renderHeaderCheckbox,
				cellRenderer: this.renderCheckbox},
			{dataKey: 'SAPIN',	width: 100, label: 'SA PIN'},
			{dataKey: 'Name',	width: 200, label: 'Name'},
			{dataKey: 'Email',	width: 300, label: 'Email'},
			{dataKey: 'Vote',	width: 250, label: 'Vote'}
		];

		this.state = {
			height: 100,
			width: 100,
		}

		// List of filterable columns
    	const filterable = ['SAPIN', 'Name', 'Email', 'Vote'];
		if (Object.keys(props.filters).length === 0) {
			filterable.forEach(dataKey => {
				this.props.dispatch(setResultsFilter(dataKey, ''));
			});
		}

		this.sortable = ['SAPIN', 'Name', 'Email', 'Vote'];

		this.lastRenderedWidth = this.state.width;
	}

	componentDidMount() {
		var wrapper = document.getElementById('Results');
		this.setState({height: wrapper.offsetHeight - 19, width: wrapper.offsetWidth})
		if (!this.props.resultsValid && this.props.ballotId) {
			this.props.dispatch(getResults(this.props.ballotId))
		}
	}
	//deleteVotersClick = (e) => {
	//	console.log('ballotSeries=', rowData.BallotID)
	//	this.props.dispatch(deleteVoters(rowData.BallotID));
	//}
	importResultsClick = (e, rowData) => {
		console.log('ballotId=', rowData.BallotID)
		this.setState({
			resultsBallotID: rowData.BallotID,
			showResultsImport: true
		})
	}
	sortChange = (event, dataKey) => {
		const {sortBy, sortDirection} = sortClick(event, dataKey, this.props.sortBy, this.props.sortDirection);
		this.props.dispatch(setResultsSort(sortBy, sortDirection));
	}
	filterChange = (event, dataKey) => {
		this.props.dispatch(setResultsFilter(dataKey, event.target.value));
	}
	handleProjectChange = (e) => {
		const project = e.target.value;
		if (project !== this.props.project) {
			this.props.dispatch(setResultsProject(project));
		}
	}
	ballotSelected = (ballotId) => {
		this.props.dispatch(getResults(ballotId));
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
	noRowsRenderer = () => {
		return <div className={styles.noRows}>{this.props.getResults? 'Loading...': 'No rows'}</div>
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
				rowHeight={18}
				headerHeight={40}
				noRowsRenderer={this.noRowsRenderer}
				headerClassName={styles.headerColumn}
				rowClassName={this.rowClassName}
				rowCount={this.props.resultsDataMap.length}
				rowGetter={({index}) => {return this.props.resultsData[this.props.resultsDataMap[index]]}}
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
			<div id='Results' style={{height: '100%'}}>
				<BallotSelector onBallotSelected={this.ballotSelected}/>
				{this.renderTable()}
			</div>
		)
	}
}

function mapStateToProps(state) {
	const {ballots, results} = state;
	return {
		filters: results.filters,
		sortBy: results.sortBy,
		sortDirection: results.sortDirection,
		ballotId: ballots.ballotId,
		resultsValid: results.ballotId && results.ballotId === ballots.ballotId,
		resultsData: results.resultsData,
		resultsDataMap: results.resultsDataMap,
		getResults: results.getBallots,
	}
}
export default connect(mapStateToProps)(Results);