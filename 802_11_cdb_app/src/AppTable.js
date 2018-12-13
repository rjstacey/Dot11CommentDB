import React from 'react';
import {Column, Table, CellMeasurer, CellMeasurerCache} from 'react-virtualized';
import styles from './AppTable.css';
//import filterData from './filter'
//import cn from 'classnames';


//export filterData;

function SortIndicator(props) {
  const {sortDirection, onClick, ...otherProps} = props;

  return (
    <svg width={18} height={18} viewBox="0 0 24 24" onClick={onClick} {...otherProps}>
      {sortDirection === 'ASC'?
        (<path d="M5 8 l5-5 5 5z" />):
         (sortDirection === 'DESC'?
          (<path d="M5 11 l5 5 5-5 z" />):
            (<path d="M5 8 l5-5 5 5z M5 11 l5 5 5-5 z" />))}
      <path d="M0 0h24v24H0z" fill="none" />
    </svg>
    );
}

export class AppTable extends React.Component {
  constructor(props) {
    super(props);

    var filters = {};
    props.columns.forEach(col => {
      if (col.filterable) {
        filters[col.dataKey] = '';
      }
    })

    this.sortBy = [];
    this.sortDirection = {}

    this.state = {
      headerHeight: 60,
      height: 270,
      width: 500,
      rowHeight: 50,
      filters
    }
    this.cache = new CellMeasurerCache({
      minHeight: 18,
      fixedWidth: true
    })

    this.clearCachedRowHeight.bind()
    this.clearAllCachedRowHeight.bind()
  }

  sortChange = (event, dataKey) => {
    const {sortBy, sortDirection} = this;

    if (event.shiftKey) {
        // Shift + click appends a column to existing criteria
        if (sortDirection.hasOwnProperty(dataKey)) {
          sortDirection[dataKey] = sortDirection[dataKey] === 'NONE'? 'ASC':
            (sortDirection[dataKey] === 'ASC'? 'DESC': 'NONE');
        } else {
          sortDirection[dataKey] = 'ASC';
        }
        if (!sortBy.includes(dataKey)) {
          sortBy.unshift(dataKey);
        }
    } else if (event.ctrlKey || event.metaKey) {
        // Control + click removes column from sort (if pressent)
        const index = sortBy.indexOf(dataKey);
        if (index >= 0) {
          sortBy.splice(index, 1);
          delete sortDirection[dataKey];
        }
    } else {
        sortBy.length = 0;
        sortBy.push(dataKey);

        if (sortDirection.hasOwnProperty(dataKey)) {
          sortDirection[dataKey] = sortDirection[dataKey] === 'NONE'? 'ASC':
            (sortDirection[dataKey] === 'ASC'? 'DESC': 'NONE');
        } else {
          sortDirection[dataKey] = 'ASC';
      }
    }

    this.props.sortFunc({sortBy, sortDirection});
  }

  filterChange = (event, dataKey) => {
    var filters = Object.assign({}, this.state.filters); // clone
    filters[dataKey] = event.target.textContent;
    this.setState({filters});
    this.props.filtFunc({filters: filters});
  }
  
  componentDidMount() {
    var wrapper = document.getElementById('AppTableWrapper');
    this.setState({height: wrapper.offsetHeight, width: wrapper.offsetWidth})
    console.log('height=', wrapper.offsetHeight, ' width=', wrapper.offsetWidth);
  }

  clearCachedRowHeight(rowIndex) {
    // Clear all the column heights in the cache.
    for (var i = 0; i < this.props.columns.length; i++) {
      this.cache.clear(rowIndex, i)
    }
  }

  clearAllCachedRowHeight() {
    this.cache.clearAll()
  }

  render() {
    const {
      headerHeight
    } = this.state;

    const renderHeaderCell = ({columnData, dataKey, label}) => {

      const sortDirection = this.sortDirection[dataKey];
      const showIndicator = columnData.hasOwnProperty('sortable')? columnData.sortable: true;
      const showFilter = this.state.filters.hasOwnProperty(dataKey);

      return (
        <div style={{height: '100%', backgroundColor: '#fafafa', padding: '5px'}}>
          <span
            title={label}
            onClick={e => this.sortChange(e, dataKey)}
            style={{cursor: 'pointer'}}>
            {label}
            {showIndicator && <SortIndicator sortDirection={sortDirection} />}
          </span><br />
          {showFilter &&
            <div
              className='headerFilt'
              placeholder='Filter'
              contentEditable
              onInput={e => {this.filterChange(e, dataKey)}}
              //dangerouslySetInnerHTML={{__html: this.state.filters[dataKey]}}
            />}
        </div>
      );
    };

    const noRowsRenderer = () => {
      return <div className={styles.noRows}>No rows</div>
    }
    const rowClassName = ({index}) => {
      if (index < 0) {
        return styles.headerRow;
      } else {
        return index % 2 === 0 ? styles.evenRow : styles.oddRow;
      }
    }
    const setRef = (ref) => {
      this.tableRef = ref
    }

    return (
      <div id='AppTableWrapper' style={this.props.style}>
        <Table
            className={styles.Table}
            height={this.state.height}
            width={this.state.width}
            headerClassName={styles.headerColumn}
            headerHeight={headerHeight}
            noRowsRenderer={noRowsRenderer}
            rowClassName={rowClassName}
            rowHeight={this.cache.rowHeight}
            deferredMeasurementCache={this.cache}
            rowGetter={this.props.rowGetter}
            rowCount={this.props.rowCount}
            ref={setRef}
            {...this.props}
            >

            {this.props.columns.map((col, index, parent) => {
              return (
                  <Column 
                    key={index}
                    className={col.className}
                    columnData={col}
                    width={col.width}
                    label={col.Header}
                    dataKey={col.dataKey}
                    headerRenderer={col.HeaderCell? col.HeaderCell: renderHeaderCell}
                    cellRenderer={col.Cell? ({rowIndex, dataKey, parent, columnIndex}) => {
                      var cellInfo = {index: rowIndex, column: {id: dataKey}};
                      return (
                        <CellMeasurer
                          cache={this.cache}
                          columnIndex={columnIndex}
                          parent={parent}
                          key={dataKey}
                          rowIndex={rowIndex}
                        >
                          {col.Cell(cellInfo)}
                        </CellMeasurer>
                      )
                    }: undefined}
                  />
              )})}
        </Table>
      </div>
    );
  }
}
