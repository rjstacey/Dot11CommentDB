# ControlHeaderCell and ControlCell components

Components to render a header cell (ControlHeaderCell) and data cell (ControlCell) for the control column of a data table.

ControlHeaderCell provides a selector and expander to select/expand all the rows and, optional, can render a custom selector component in a dropdown.

ControlCell provides a selector and expander for table row in which it is rendered.

## ControlHeaderCell component props

| Prop               | Type                  | Description
| -------------------| -------------------   | -----------
| anchorEl           | element               | An element (position: relative) to anchor a dropdown (if needed)
| customSelectorEl   | element               | If present, provides a custom selector element that renders in a dropdown
| selectors          | AppTableDataSelectors | Data slice selectors
| actions            | AppTableDataActions   | Data slice actions

## ControlHeaderCell data slice selectors and actions

The selector `selectSortedFilteredIds(state)` is used to obtain an array of sorted and filtered row identifiers, i.e., identifiers for the rows the are currently shown in the table.

The selector `selectSelected(state)` is used to obtain an array of row identifiers for the selected rows.

The selector `selectExpanded(state)` is used to obtain an array of row identifiers for the expanded rows.

The action `setSelected(ids)` is used to set the selected array.

The action `setExpanded(ids)` is used to set the expanded array.

## ControlCell component props

| Prop               | Type                  | Description
| -------------------| --------------------- | -----------
| rowId              | number or string      | The row indentifier.
| selectors          | AppTableDataSelectors | Data slice selectors
| actions            | AppTableDataActions   | Data slice actions

## ControlCell data slice selectors and actions

The selector `selectSelected(state)` is used to obtain an array of row identifiers for the selected rows. A row is selected if `rowId` appears in the array.

The selector `selectExpanded(state)` is used to obtain an array of row identifiers for the expanded rows. A row is selected if `rowId` appears in the array.

The action `toggleSelected(ids)` is used to toggle the inclusion/exclusion of ids in the selected array.

The action `toggleExpanded(ids)` is used to toggle the inclusion/exclusion of ids in the expanded array.
