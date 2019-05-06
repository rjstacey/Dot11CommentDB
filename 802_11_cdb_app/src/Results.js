import React from 'react';
import {connect} from 'react-redux';
import {Column, Table} from 'react-virtualized';
import BallotSelector from './BallotSelector';
import {setResultsSort, setResultsFilter, getResults} from './actions/results'
import {setBallotId} from './actions/ballots'
import {sortClick} from './filter'
import styles from './AppTable.css'

class ResultsSummary extends React.PureComponent {
	render() {
		var r = this.props.resultsSummary;
		var b = this.props.ballot;
		var {votingPoolSize} = this.props;
		console.log(this.props)
		let p = parseFloat(100*r.Approve/(r.Approve+r.Disapprove));
		let percentStr = isNaN(p)? '': `${p.toFixed(1)}%`;
		let returns = r.Approve+r.Disapprove+r.Abstain
		let returnsPct = parseFloat(100*returns/votingPoolSize).toFixed(1)
		let abstainsPct = parseFloat(100*r.Abstain/votingPoolSize).toFixed(1)

		let dStart = new Date(b.Start);
		var bStart = dStart.toLocaleString('en-US', {year: 'numeric', month: 'numeric', day: 'numeric' , timeZone: 'America/New_York'});
		let dEnd = new Date(b.End);
		var bEnd = dEnd.toLocaleString('en-US', {year: 'numeric', month: 'numeric', day: 'numeric' , timeZone: 'America/New_York'})
		const _MS_PER_DAY = 1000 * 60 * 60 * 24;
		var bDuration = Math.floor((dEnd - dStart) / _MS_PER_DAY)

		var style = {
			container: {
				display: 'flex',
				justifyContent: 'space-arround',
			},
			title: {display: 'block', fontWeight: 'bold', margin: '5px 0 5px 0'},
			col: {paddingRight: '10px'},
			label1: {display: 'inline-block', textAlign: 'left', width: '100px'},
			value1: {display: 'inline-block', textAlign: 'right', width: '80px'},
			label2: {display: 'inline-block', textAlign: 'left', width: '100px'},
			value2: {display: 'inline-block', textAlign: 'right', width: '80px'},
			label3: {display: 'inline-block', textAlign: 'left', width: '220px'},
			value3: {display: 'inline-block', textAlign: 'right', width: '45px'},
			label4: {display: 'inline-block', textAlign: 'left', width: '275px'},
			value4: {display: 'inline-block', textAlign: 'right', width: '45px'}
		}
		return (
			<div style={style.container}>
				<div style={style.col}>
					<div style={style.title}>Ballot</div>
					<div style={style.label1}>Opened:</div><div style={style.value1}>{b? bStart: ''}</div><br />
					<div style={style.label1}>Closed:</div><div style={style.value1}>{b? bEnd: ''}</div><br />
					<div style={style.label1}>Duration:</div><div style={style.value1}>{b? bDuration: ''} days</div><br />
					<div style={style.label1}>Voting pool:</div><div style={style.value1}>{votingPoolSize}</div>
				</div>
				<div style={style.col}>
					<div style={style.title}>Result</div>
					<div style={style.label2}>Approval rate:</div><div style={style.value2}>{percentStr}</div><br />
					<div style={style.label2}>Approve:</div><div style={style.value2}>{r.Approve}&nbsp;</div><br />
					<div style={style.label2}>Disapprove:</div><div style={style.value2}>{r.Disapprove}&nbsp;</div><br />
					<div style={style.label2}>Abstain:</div><div style={style.value2}>{r.Abstain}&nbsp;</div><br />
				</div>
				<div style={style.col}>
					<div style={style.title}>Invalid votes</div>
					<div style={style.label3}>Not in pool:</div><div style={style.value3}>{r.InvalidVote}</div><br />
					<div style={style.label3}>Disapprove without comment:</div><div style={style.value3}>{r.InvalidDisapprove}</div><br />
					<div style={style.label3}>Abstain reason:</div><div style={style.value3}>{r.InvalidAbstain}</div>
				</div>
				<div style={style.col}>
					<div style={style.title}>Other criteria</div>
					<div style={style.label4}>Total returns:</div><div style={style.value4}>{returns}</div><br />
					<div style={style.label4}>Returns as % of pool:</div><div style={style.value4}>{returnsPct}%</div><br />
					<div>{returnsPct > 50? 'Meets': 'Does not meet'} return requirement (&gt;50%)</div>
					<div style={style.label4}>Abstains as % of returns:</div><div style={style.value4}>{abstainsPct}%</div><br />
					<div>{abstainsPct < 30? 'Meets': 'Does not meet'} abstain requirement (&lt;30%)</div>
				</div>
			</div>
		)
	}
}

class Results extends React.PureComponent {
	constructor(props) {

		super(props);

		this.columns = [
			{dataKey: 'SAPIN',		label: 'SA PIN',		width: 75},
			{dataKey: 'LastName',	label: 'Last Name', 	width: 150},
			{dataKey: 'FirstName',	label: 'First Name', 	width: 150},
			{dataKey: 'MI',			label: 'MI',			width: 50},
			{dataKey: 'Email',		label: 'Email',			width: 250},
			{dataKey: 'Vote',		label: 'Vote',			width: 210},
			{dataKey: 'CommentCount', label: 'Comments',	width: 110},
			{dataKey: 'Status',		label: 'Status',		width: 250}
		];

		this.state = {
			height: 100,
			width: 100,
			showSummary: true
		}

		// List of filterable columns
    	const filterable = ['SAPIN', 'LastName', 'FirstName', 'MI', 'Email', 'Vote', 'CommentCount', 'Status'];
		if (Object.keys(props.filters).length === 0) {
			filterable.forEach(dataKey => {
				this.props.dispatch(setResultsFilter(dataKey, ''));
			});
		}
		this.sortable = filterable;
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
	toggleShowSummary = () => {
		this.setState({showSummary: !this.state.showSummary})
		this.updateDimensions()
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

	renderTable = () => {
		//console.log('render ', this.state.width, this.state.height)
		return (
			<Table
				className={styles.Table}
				rowHeight={20}
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
			<div id='Results'>
				<div id='top-row'>
					<span
						style={{cursor: 'pointer'}}
						className={this.state.showSummary? "fa fa-angle-down": "fa fa-angle-right"}
						onClick={() => this.setState({showSummary: !this.state.showSummary})}
					/>
					<BallotSelector
						onBallotSelected={this.ballotSelected}
					/>
					{this.state.showSummary &&
						<ResultsSummary
							resultsSummary={this.props.resultsSummary}
							ballot={this.props.ballot}
							votingPoolSize={this.props.votingPoolSize}
						/>
					}
					{/*<p>Rows: {this.props.resultsDataMap.length}</p>*/}
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
		ballot: results.ballot,
		votingPoolSize: results.votingPoolSize,
		resultsDataValid: results.resultsDataValid && results.ballotId === ballots.ballotId,
		resultsData: results.resultsData,
		resultsDataMap: results.resultsDataMap,
		resultsSummary: results.resultsSummary,
		getResults: results.getResults,
	}
}
export default connect(mapStateToProps)(Results);