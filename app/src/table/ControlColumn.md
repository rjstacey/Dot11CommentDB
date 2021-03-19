# ControlHeader and ControlCell components

Components to render a header (ControlHeader) and data cell (ControlCell) for the control column of a data table.

ControlHeader provides a selector and expander to select/expand all the rows and, optional, can render a custom selector component in a dropdown.

ControlCell provides a selector and expander for table row in which it is rendered.

The expander is only present if the dataset has an expander subslice.

## ControlHeader component props

| Prop               | Type     | Description
| -------------------| ------   | -----------
| dataSet            | string   | The redux store slice where the table data resides.
| anchorRef          | element  | An element (position: relative) to anchor a dropdown (if needed)
| children           | element  | If present, provides a custom selector element that renders in a dropdown

## ControlHeader component store

The selector `getSortedFilteredIds(state, dataSet)` from 'store/dataSelectors' is used to obtain an array of sorted and filtered row IDs, i.e., IDs for the rows the are currently shown in the table.

The selector `getSelected(state, dataSet)` from 'store/selected' is used to obtain an array of row identifiers for the selected rows.

The action `setSelected(state, dataSet, ids)` is used to set the selected array.

The selector `getExpanded(state, dataSet)` from 'store/expanded' is used to obtain an array of row identifiers for the expanded rows.

The action `setExpanded(state, dataSet, ids)` is used to set the expanded array.

## ControlCell component props

| Prop               | Type   | Description
| -------------------| ------ | -----------
| dataSet            | string | The redux store slice where the table data resides.
| rowKey             | string | The row indentifier key.
| rowData            | string | The table data row object.

## ControlCell component store

The selector `getSelected(state, dataSet)` from 'store/selected' is used to obtain an array of row identifiers for the selected rows. A row is selected if `rowData[rowKey]` appears in the array.

The action `toggleSelected(state, dataSet, ids)` is used to toggle the inclusion/exclusion of ids in the selected array.

The selector `getExpanded(state, dataSet)` from 'store/expanded' is used to obtain an array of row identifiers for the expanded rows.
A row is expanded if `rowData[rowKey]` appears in the array.

The action `toggleExpanded(state, dataSet, ids)` is used to toggle the inclusion/exclusion of ids in the selected array.
