# AppTable

A flexible data table viewing component built around react-window. It handles large datasets by only rendering the rows in (or nearby) the view port.

AppTable supports row selection; a row that appears in the `selected` list will be highlighted. Rows can be selected with a click or touch.
Shift-click selects a range. Ctrl-click selects multiple entries.
The current selection can be changed using the up and down keyboard arrow keys. Ctrl-A will select all rows.

AppTable supports variable height rows. A row that appears in the `expanded` list will be rendered such that all data is visible. A row not in the
in the list is rendered with `estimatedRowHeight` height.

## Component props

| Prop               | Type   | Description
| -------------------| ------ | -----------
| dataSet            | string | The redux store slice where the table data resides
| columns            | array  | An array of objects describing the columns
| rowKey             | number or string | The row data object property that identifies the row
| headerHeight       | number | Header row height
| estimatedRowHeight | number | Estimated height of each data row. This is the actual height unless the row identifier appears in the `expanded` array.
| rowGetter          | func   | Callback function to retrieve row data (optional)

The `columns` array contains objects, one for each column, that have the following shape:

* `key`: A string that uniquely identifies the column. If a `cellRenderer` is not provided, then `key` also idenfies the data to render from the table data row object.
* `width`: Flex basis for the column width.
* `flexGrow`: Flex grow for the column width.
* `flexShrink`: Flex shrink for the column width.
* `label`: Column label if `headerRenderer` is not supplied.
* `headerRenderer`: A function to render the header cell (optional).
* `cellRenderer`: A function to render the data cell (optional).
* `...colProps`: additional props passed to the `headerRenderer` and `cellRenderer` functions

The `headerRenderer` function receives the following props:

* `anchorRef`: A ref for a element (position: relative) that anchors dropdowns.
* `rowKey`: The table row identifier.
* `dataKey`: the table data row object key that identifies the cell data.
* `column`: the object corresponding to the column from the columns array.
* `...colProps`: additional props from the column object.

If `headerRenderer` is not supplied, then the header cell is rendered from `label`.

The `cellRenderer` function receives the following props:

* `rowIndex`: The table data array row index.
* `rowKey`: The table data row identifier.
* `dataKey`: The column key. Expected to also be the table data row object key for the cell data. 
* `rowData`: The table data row object, i.e., data[rowIndex].
* `...colProps`: Additional props from the column object.

If `cellRenderer` is not supplied, then the cell is rendered from `rowData[dataKey]`.

The `rowGetter` function receives the following props:

* `rowIndex`: The table data array row index.
* `data`: The table data array.

## Component store

AppTable is connected to the redux store slice identified by `dataSet`. The store slice has the following shape:

* `loading`: A boolean that indicates weather or not table data is being loaded.
* `ui`: a subslice of the dataset for UI configuration that contains the `tableView` and `tablesConfig` data.

The selector `getSortedFilteredData(state, dataSet)` from 'store/dataSelectors' is used to obtain the table data array.

The selector `getSelected(state, dataSet)` from 'store/selected' is used to obtain an array of row identifiers for the selected rows.
A row that is present in this array is highlighted.
The action `setSelected(dataSet, ids)` from 'store/selected' is used to set the set of selected rows.
A row is selected when the user clicks or touches the row.

The selector `getExpanded(state, dataSet)` from 'store/expanded' is used to obtain an array of row identifiers for the expanded rows.

The `ui` subslice of the data set contains the `tableView` and `tablesColumns` entries that identify the selected table configuration and the table
configuration itself, respectively. `tableView` is a string that defaults to 'default' for data sets where there is only one
table view.

`tablesConfig[tableView]` is the configuration data for the current table view and has the following shape:

* `fixed`: A boolean that indicates whether the column widths are fixed or scaled so that the table exactly fits the container element.
* `columns`: An object with a configuration object for each column indexed by the column `key`. AppTable cares about the column configuration
attribute `width` and will use it (if present) to override the default `width` supplied in the `columns` prop. AppTable will update the `width`
attribute for each column when it unmounts.

The action `upsertTableColumns(dataSet, view, columns)` is used to updated `tablesConfig[view].columns`, merging in the supplied `columns` parameter.

