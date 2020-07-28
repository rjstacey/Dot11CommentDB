import PropTypes from 'prop-types'
import {connect} from 'react-redux'
import Select from 'react-dropdown-select'
import {genCommentsOptions} from '../actions/comments'


/** @jsx jsx */
import { css, jsx } from '@emotion/core'

function CommentGroupSelector({value, onChange, options, getOptions, loading, placeholder, ...otherProps}) {

	const selectCss = css`
		background-color: white;
		border: 1px solid #ddd;
		padding: 0;
		box-sizing: border-box;
		width: unset;`

	const selectValue = options.find(o => o.value === value)
	return (
		<div {...otherProps}>
			<Select
				css={selectCss}
				values={selectValue? [selectValue]: []}
				onChange={(values) => onChange(values.length? values[0].value: '')}
				options={options}
				loading={loading}
				create
				clearable
				onDropdownOpen={getOptions}
				placeholder={placeholder}
			/>
		</div>
	)
}

CommentGroupSelector.propTypes = {
	value: PropTypes.string.isRequired,
	onChange: PropTypes.func.isRequired,
	loading: PropTypes.bool.isRequired,
	options: PropTypes.array.isRequired,
	getOptions: PropTypes.func.isRequired,
}

export default connect(
	(state) => {
		const {comments} = state
		return {
			options: comments.options['CommentGroup'] || [],
			loading: comments.getComments
		}
	},
	(dispatch) => {
		return {
			getOptions: () => dispatch(genCommentsOptions('CommentGroup'))
		}
	}

)(CommentGroupSelector)
