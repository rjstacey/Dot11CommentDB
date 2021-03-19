# ControlHeader and ControlCell

Components to render a header (ControlHeader) and data cell (ControlCell) for the control column of a data table.

ControlHeader provides seelctors and expanders for all the rows and, in each row, ControlCell provides a selector and exander for that row.

## ControlHeader props

| Prop               | Type     | Description
| -------------------| ------   | -----------
| dataSet            | string   | The redux store slice where the table data resides.
| anchorRef          | element  | An element (position: relative) to anchor a dropdown (if needed)
| children           | element  | If present, provides a custom selector element that renders in a dropdown

## ControlHeader store

The selector `getSortedFilteredIds(state, dataSet)` from 'store/dataSelectors' is used to obtain an array of sorted and filtered row IDs, i.e., IDs for the rows the are currently shown in the table.

The selector `getSelected(state, dataSet)` from 'store/selected' is used to obtain an array of row identifiers for the selected rows.

The action `setSelected(state, dataSet, ids)` is used to set the selected array.

The selector `getExpanded(state, dataSet)` from 'store/expanded' is used to obtain an array of row identifiers for the expanded rows.

The action `setExpanded(state, dataSet, ids)` is used to set the expanded array.

## ControlCell props

| Prop               | Type   | Description
| -------------------| ------ | -----------
| dataSet            | string | The redux store slice where the table data resides.
| rowKey             | string | The row indentifier key.
| rowData            | string | The table data row object.

## ControlCell store

The selector `getSelected(state, dataSet)` from 'store/selected' is used to obtain an array of row identifiers for the selected rows. A row is selected if `rowData[rowKey]` appears in the array.

The action `toggleSelected(state, dataSet, ids)` is used to toggle the inclusion/exclusion of ids in the selected array.

The selector `getExpanded(state, dataSet)` from 'store/expanded' is used to obtain an array of row identifiers for the expanded rows.
A row is expanded if `rowData[rowKey]` appears in the array.

The action `toggleExpanded(state, dataSet, ids)` is used to toggle the inclusion/exclusion of ids in the selected array.
