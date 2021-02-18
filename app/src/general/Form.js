import PropTypes from 'prop-types'
import React from 'react'
import styled from '@emotion/styled'
import ReactDropdownSelect from 'react-dropdown-select'
import {Spinner} from '../general/Icons'

const StyledSelect = styled(ReactDropdownSelect)`
	background-color: #fafafa;
	border: 1px solid #ddd;
	padding: 0 5px;
	min-height: unset;
	box-sizing: border-box;
	:focus-within {
		outline: 0;
		box-shadow: 0 0 0 3px rgba(0,116,217,0.2);
	}
	:focus-within,
	:hover {
		border-color: #0074D9;
	}
	&.react-dropdown-select-dropdown {
		z-index: 15;
	}
	&.react-dropdown-select {
		opacity: unset;	/* don't change opacity when disabled */
	}
	& .react-dropdown-select-content {
		flex-wrap: nowrap;
		line-height: 25px;
	}
	& .react-dropdown-select-input {
		font-size: unset;
		&::placeholder {
			font-style: italic;
			color: GreyText;
		}
	}
	& .react-dropdown-select-clear {
		margin: 0;
	}
`;

/* Because of the unstyled div wrapper on react-drop-downselect, we need to add another wrapper
 * if we want to style this outer wrapper. Mostly an issue with flex. */
const Select = ({style, className, readOnly, clearable, dropdownHandle, onChange, ...otherProps}) =>
	<div
		style={style}
		className={className}
	>
		<StyledSelect
			clearable={!readOnly && clearable}
			dropdownHandle={!readOnly && dropdownHandle}
			disabled={readOnly}
			onChange={readOnly? () => {}: onChange}
			{...otherProps}
		/>
	</div>

const Input = styled.input`
	display: inline-block;
	cursor: inherit;
	-webkit-appearance: none;
	background-color: #fafafa;
	border: 1px solid #ddd;
	/*box-shadow: 0 1px 2px rgba(0,0,0,0.05), inset 0px -15px 10px -12px rgba(0,0,0,0.05);*/

	:focus {
		outline: 0;
		box-shadow: 0 0 0 3px rgba(0,116,217,0.2);
	}
	:focus,
	:not([disabled]):hover {
		border-color: #0074D9;
	}
	&[type='text'],
	&[type='search'],
	&[type='date'] {
		border-radius: 3px;
		line-height: 25px;
		padding: 0 5px;
	}

	&[type='checkbox'] {
		padding: 6px;
		width: 14px;
		height: 14px;
		position: relative;
		:checked {
			background-color: #e9ecee;
			border: 1px solid #adb8c0;
		}
		:indeterminate {
			background-color: #e9ecee;
			border: 1px solid #adb8c0;
		}
		:checked:after {
			content: '\\2714';
			font-size: 10px;
			font-weight: 700;
			position: absolute;
			top: -1px;
			left: 1px;
		}
		:indeterminate:after {
			content: "";
			position: absolute;
			top: 1px;
			left: 1px;
			border: 5px solid #5f6061;
		}
	}
`;

const Checkbox = ({indeterminate, ...otherProps}) =>
	<Input type='checkbox' ref={el => el && (el.indeterminate = indeterminate)} {...otherProps}/>

const TextArea = styled.textarea`
	font-family: inherit;
	font-size: unset;
	background-color: #fafafa;
	border: 1px solid #ddd;
	border-radius: 3px;
	line-height: 25px;
	:focus {
		outline: 0;
		box-shadow: 0 0 0 3px rgba(0,116,217,0.2);
	}
	:focus,
	:hover {
		border-color: #0074D9;
	}
`;

const Container = styled.div`
	display: flex;
	flex-direction: column;
`;

const Row = styled.div`
	display: flex;
	flex-direction: row;
	margin: 5px 0;
	justify-content: space-between;
`;

const Col = styled.div`
	display: flex;
	flex-direction: column;
	flex: 1;
	margin: 0 10px;
	:first-of-type {margin-left: 0}
	:last-child {margin-right: 0}
`;

export const Title = styled.h3`
	margin: 5px 0 20px;
	align-self: center;
	font-weight: bold;
	color: #0099CC;
`;

const ErrMsg = styled(Row)`
	color: red;
	font-weight: bold;
	justify-content: center;
`;

const ButtonRow = styled(Row)`
	justify-content: space-around;
`;

const Button = styled.button`
	width: 100px;
	padding: 8px 16px;
	text-transform: uppercase;
	color: white;
	font-weight: bold;
	background-color: #0099CC;
	border: none;
	border-radius: 30px;
	:focus {outline: none}
`;

const FieldContainer = styled.div`
	display: flex;
	align-items: center;
	flex: 1;
	justify-content: space-between;
	/*margin: 10px 0;
	:first-of-type {margin-top: 0}
	:last-child {margin-bottom: 0}*/
	& > label {margin-right: 10px}
`;

const Field = ({style, className, label, children}) =>
	<FieldContainer
		style={style}
		className={className}
	>
		<label>{label}</label>
		{typeof children === 'string'? <span>{children}</span>: children}
	</FieldContainer>

const FieldLeft = styled(Field)`
	justify-content: left;
	flex: unset;
`;

const ListContainer = styled.div`
	display: flex;
	flex-direction: column;
	flex: 1;
`;

const List = ({style, className, label, children}) =>
	<ListContainer
		style={style}
		className={className}
	>
		{label && <label>{label}</label>}
		{children}
	</ListContainer>

const ListItemContainer = styled.div`
	display: flex;
	align-items: center;
	margin: 5px 0 0 10px;
	label {margin: 0 5px}
`;

const ListItem = ({style, className, children}) =>
	<ListItemContainer
		style={style}
		className={className}
	>
		{children}
	</ListItemContainer>

const Form = ({style, className, title, busy, errorText, submit, submitLabel, cancel, cancelLabel, children}) => 
	<Container
		style={style}
		className={className}
	>
		{title && <Title>{title}</Title>}
		{busy !== undefined && <Spinner style={{alignSelf: 'center', visibility: busy? 'visible': 'hidden'}}/>}
		{children}
		{errorText !== undefined && <ErrMsg>{errorText || '\u00a0'}</ErrMsg>}
		<ButtonRow>
			<Button onClick={submit} >{submitLabel || 'OK'}</Button>
			{cancel && <Button onClick={cancel} >{cancelLabel || 'Cancel'}</Button>}
		</ButtonRow>
	</Container>

Form.propTypes = {
	submit: PropTypes.func.isRequired,
	cancel: PropTypes.func,
	submitLabel: PropTypes.string,
	cancelLabel: PropTypes.string,
	title: PropTypes.string,
	errorText: PropTypes.string,
};

export {
	Form,
	Field,
	FieldLeft,
	Row,
	Col,
	List,
	ListItem,
	Select,
	Input,
	TextArea,
	Checkbox
}