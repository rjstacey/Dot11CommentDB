# AppTableHeaderCell

A component that renderes a header cell and provides a dropdown with sort and filter operations for a particular field in a data table.

The component does not necessary map 1:1 to the actual table columns. A Table column might render multiple data fields with an AppTableHeaderCell component for each field.

In the table header, TableColumnHeader renders the field label along with icons. If the table is sorted by the field data (sort direction is not `None`), then an ascending or descending sort icon is displayed. The sort icon is also alphabetical or numerical based is sort type. If the table is filtered based on the field data, then the filter icon is displayed. If the table is either sortable or filterable (or both) on the field, then a down-caret is displayed to show that the these functions are availble and the user can open the dropdown by clicking/touching the field label. 

## Component props

| Prop               | Type                  | Description
| -------------------| --------------------  | -----------
| label              | string                | The column label
| dataKey            | string                | The column key
| column             | ColumnProperties      | Column properties (entry in the columns array)
| anchorEl           | element               | An element (position: relative) to anchor the dropdowns
| selectors          | AppTableDataSelectors | Data slice selectors
| actions            | AppTableDataActions   | Data slice actions

## Component data slice selectors and actions

AppTableHeaderCell is connected to the redux store slice identified by `dataSet` and expects the store slice to provide the following:

The selector `selectSorts(state)` is used to get the sort data for the table. The action `setSortDirection({dataKey, direction})` is used to set the sort direction for a column.

The selector `selectFilter(state, dataKey)` is used to get the filter data for the table column. The actions `setFilter()`, `addFilter()`, `removeFilter()` modify the filters for the table column.

## Sorting

A field is sortable if the data slice has a sort entry for `dataKey`.

If the field is sortable, then sort options are present in the dropdown. The user can select to sort in asceding or descending order. Or not sort by this field (both ascending and descending unselected).

The table may be sorted on multiple fields. If so, the table data is sorted by applying the field sorts in the order in which they are selected. The sort subslice in the store keeps track of the order in which columns are selected for sorting.

## Filtering

A field is filterable if the data slice has a filter entry for `dataKey`.

If the field is filterable, then filter options are present in the dropdown. These consist of a list of options and a search box to help select one or more exact match options.

The search box can also generate a 'contains' search option, i.e., a match option that selects rows that contain the search string (case insensitive) in the field.

The search box can also generate a 'regex' search option. To do this the user enters a slash ('/'). Another slash will appear and the regex is entered between the slashes. Regex options (i, g, etc.) can be placed after the second slash.

While the search is being typed, the options window will show the seach prefixed by 'Contains:' or 'Regex:' as well as exact match options that match the search term. Hitting enter will create and entry for the 'contains' or 'regex' search. Alternatively, the user can select from one of the exact match options.

If the table is sortable on the field, then the exact match options are sorted so that they appear in the same order as they are shown in the table. The 'contains' and 'regex' filters always appear ahead of the exact match options.
