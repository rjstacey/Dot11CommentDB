import PropTypes from 'prop-types';
import React from 'react';
import csStyles from './ColumnSelector.css';

export default class ColumnSelector extends React.PureComponent {

	static propTypes = {
		list: PropTypes.array.isRequired,
		isChecked: PropTypes.func.isRequired
	}

	constructor(props) {
		super(props)
		this.state = {
			isOpen: false
		}
	}

	componentDidUpdate() {
		setTimeout(() => {
			if (this.state.isOpen) {
				window.addEventListener('click', this.close)
			}
			else{
				window.removeEventListener('click', this.close)
			}
		}, 0)
	}

	componentWillUnmount() {
		window.removeEventListener('click', this.close)
	}

	close = () => {
		this.setState({isOpen: false})
	}

	render() {
		const {list} = this.props
		const {isOpen} = this.state
		return (
			<div className={csStyles.wrapper}>
				<div className={csStyles.header} onClick={() => this.setState({isOpen: !isOpen})}>
					<div className={csStyles.headerTitle}>Select Columns</div><i className={isOpen? "fa fa-angle-up": "fa fa-angle-down"} />
				</div>
				{isOpen &&
					<ul className={csStyles.list}>
						{list.map((item, index) => (
							<li className={csStyles.listItem} key={item.dataKey} onClick={() => this.props.toggleItem(item.dataKey)}>
								{this.props.isChecked(item.dataKey) && '\u2714'} {item.label} 
							</li>
						))}
					</ul>
				}
			</div>
		)
	}
}
