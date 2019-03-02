import React from 'react';
import {connect} from 'react-redux';
import {Column, Table} from 'react-virtualized';
import BallotSelector from './BallotSelector';
import {setResultsSort, setResultsFilter, getResults} from './actions/results'
import {setBallotId} from './actions/ballots'
import {sortClick, SortIndicator} from './filter'
import styles from './AppTable.css'


class Results extends React.Component {
	constructor(props) {

		super(props);

		this.columns = [
			{dataKey: '',		width: 40,  label: '',
				sortable: false,
				headerRenderer: this.renderHeaderCheckbox,
				cellRenderer: this.renderCheckbox},
			{dataKey: 'SAPIN',	width: 100, label: 'SA PIN'},
			{dataKey: 'Name',	width: 200, label: 'Name'},
			{dataKey: 'Email',	width: 300, label: 'Email'},
			{dataKey: 'Vote',	width: 250, label: 'Vote'},
			{dataKey: 'Status',	width: 250, label: 'Status'}
		];

		this.state = {
			height: 100,
			width: 100,
		}

		// List of filterable columns
    	//const filterable = ['SAPIN', 'Name', 'Email', 'Vote', 'Status'];
    	const filterable = [];
		if (Object.keys(props.filters).length === 0) {
			filterable.forEach(dataKey => {
				this.props.dispatch(setResultsFilter(dataKey, ''));
			});
		}

		this.sortable = ['SAPIN', 'Name', 'Email', 'Vote', 'Status'];
	}

	componentDidMount() {
		this.updateDimensions()
		window.addEventListener("resize", this.updateDimensions);

		const ballotId = this.props.match.params.ballotId;
		//console.log(ballotId, this.props.ballotId)
		if (this.props.ballotId !== ballotId && (this.props.ballotId || ballotId)) {
			if (ballotId) {
				// Routed here with parameter ballotId specified, but not matching stored ballotId
				// Store the ballotId and get results for this ballotId
				this.props.dispatch(setBallotId(ballotId))
				this.props.dispatch(getResults(ballotId))
			}
			else {
				// Routed here with parameter ballotId unspecified, but we have a ballotId stored
				// Redirect to the stored ballotId
				this.props.history.replace(`/Results/${this.props.ballotId}`)
				console.log(`/Results/${this.props.ballotId}`)
				this.props.dispatch(getResults(this.props.ballotId))
			}
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
		this.setState({height, width})
	}
	sortChange = (event, dataKey) => {
		const {sortBy, sortDirection} = sortClick(event, dataKey, this.props.sortBy, this.props.sortDirection);
		this.props.dispatch(setResultsSort(sortBy, sortDirection));
	}
	filterChange = (event, dataKey) => {
		this.props.dispatch(setResultsFilter(dataKey, event.target.value));
	}
	ballotSelected = (ballotId) => {
		// Redirect to results page with selected ballot
		this.props.history.push(`/Results/${ballotId}`)
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
				style={{boxSizing: 'border-box', width: '100%'}}
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

	renderResultsSummary = () => {
		if (!this.props.resultsDataValid) {
			return <div style={{height: 56}} />
		}
		var results = this.props.resultsSummary;
		let el = [];
		let p = parseFloat(100*results.Approve/(results.Approve+results.Disapprove));
		let percentStr = isNaN(p)? '': ` (${p.toFixed(1)}%)`;
		el.push(<span key={el.length}>{`${results.Approve}/${results.Disapprove}/${results.Abstain}` + percentStr}</span>)
		el.push(<br key={el.length}/>)
		if (results.InvalidAbstain !== undefined && results.InvalidAbstain !== null) {
			el.push(<span key={el.length}>{`Invalid Abstain: ${results.InvalidAbstain}`}</span>)
			el.push(<br key={el.length}/>)
		}
		if (results.InvalidVote !== undefined && results.InvalidVote !== null) {
			el.push(<span key={el.length}>{`Invalid Vote: ${results.InvalidVote}`}</span>)
			el.push(<br key={el.length}/>)
		}
		return <div style={{height: 56}}>{el}</div>
	}

	renderTable = () => {
		//console.log('render ', this.state.width, this.state.height)
		return (
			<Table
				className={styles.Table}
				rowHeight={18}
				height={this.state.height}
				width={this.state.width}
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
			<div id='Results' style={{width: '100%', height: '100%'}}>
				<div id='top-row'>
					<BallotSelector onBallotSelected={this.ballotSelected}/>
					{this.renderResultsSummary()}
				</div>
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
		resultsDataValid: results.resultsDataValid && results.ballotId === ballots.ballotId,
		resultsData: results.resultsData,
		resultsDataMap: results.resultsDataMap,
		resultsSummary: results.resultsSummary,
		getResults: results.getBallots,
	}
}
export default connect(mapStateToProps)(Results);