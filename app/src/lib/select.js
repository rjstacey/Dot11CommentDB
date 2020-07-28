/*
 * Determine if all items in map have been selected
 */
export function allSelected(selectedList, dataMap, data, idKey) {
	var allSelected = dataMap.length > 0; // not if list is empty
	for (var i = 0; i < dataMap.length; i++) {
		if (selectedList.indexOf(data[dataMap[i]][idKey]) < 0) {
			allSelected = false;
		}
	}
	return allSelected;
}

export function toggleVisible(currSelectedList, dataMap, data, idKey) {
	let selectedList = currSelectedList.slice();
	//if (allSelected(selectedList, dataMap, data, idKey)) {
	if (selectedList.length) {
		// remove all visible (filtered) IDs
		for (let i = 0; i < dataMap.length; i++) {
			let id = data[dataMap[i]][idKey];
			let j = selectedList.indexOf(id)
			if (j > -1) {
				selectedList.splice(j, 1);
			}
		}
	}
	else {
		// insert all visible (filtered) IDs if not already present
		for (let i = 0; i < dataMap.length; i++) {
			let id = data[dataMap[i]][idKey];
			if (selectedList.indexOf(id) < 0) {
				selectedList.push(id)
			}
		}
	}
	return selectedList;
}

export function updateSelected(origSelected, origData, newData, key) {
	let newSelected = []
	for (let s of origSelected) {
		const value = origData[s][key]
		const i = newData.findIndex(c => c[key] === value)
		if (i !== -1) {
			newSelected.push(i)
		}
	}
	return newSelected
}
