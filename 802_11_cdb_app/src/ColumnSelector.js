import PropTypes from 'prop-types';
import React, {useState, useEffect} from 'react';
import {IconAngleDown, IconAngleUp} from './Icons';
import styles from './ColumnSelector.css';

function ColumnSelector(props) {
	const [isOpen, setOpen] = useState(false)
	const {list} = props

	useEffect(() => {
		if (isOpen) {
			window.addEventListener('click', close)
		}
		else{
			window.removeEventListener('click', close)
		}

		return () => {
			window.removeEventListener('click', close)
		}
	})

	function close() {
		setOpen(false)
	}

	return (
		<div className={styles.wrapper}>
			<div className={styles.header} onClick={() => setOpen(!isOpen)}>
				<div className={styles.headerTitle}>Select Columns</div>{isOpen? <IconAngleUp />: <IconAngleDown />}
			</div>
			{isOpen &&
				<ul className={styles.list}>
					{list.map((item, index) => (
						<li className={styles.listItem} key={item.dataKey} onClick={() => props.toggleItem(item.dataKey)}>
							{props.isChecked(item.dataKey) && '\u2714'} {item.label} 
						</li>
					))}
				</ul>
			}
		</div>
	)
}
ColumnSelector.propTypes = {
	list: PropTypes.array.isRequired,
	isChecked: PropTypes.func.isRequired,
	toggleItem: PropTypes.func.isRequired
}

export default ColumnSelector
