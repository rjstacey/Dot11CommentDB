import PropTypes from 'prop-types';
import React from 'react';
import styled from '@emotion/styled';

const Container = styled.div`
	background: rgb(255, 255, 255);
	border: 1px solid rgba(0, 0, 0, 0.2);
	//box-shadow: rgb(0 0 0 / 15%) 0px 3px 12px;
	border-radius: 4px;
	padding: 5px;
	display: flex;
	flex-wrap: wrap;
`;

const outline = 'z-index: 2; outline: white solid 2px; box-shadow: rgb(0, 0, 0, 0.25) 0 0 5px 2px;';

const ColorBox = styled.div`
	position: relative;
	width: 25px;
	height: 25px;
	outline: none;
	cursor: pointer;
	${({ isSelected }) => isSelected? outline: undefined}
	:hover {
		${outline}
	}
`;

function ColorPicker({options, value, onChange}) {

	function handleClick(v) {
		if (onChange)
			onChange(v) 
	}

	return (
		<Container>
			{options.map(v => 
				<ColorBox
					key={v}
					onClick={() => handleClick(v)}
					style={{background: v}}
					isSelected={v === value}
				/>
			)}
		</Container>
	)
}

ColorPicker.propTypes = {
	value: PropTypes.string.isRequired,
	onChange: PropTypes.func.isRequired
}

ColorPicker.defaultProps = {
	options: ['#B80000', '#DB3E00', '#FCCB00', '#008B02', '#006B76', '#1273DE', '#004DCF', '#5300EB'],
}

export default ColorPicker;