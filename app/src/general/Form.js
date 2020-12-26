import PropTypes from 'prop-types'
import React from 'react'
import styled from '@emotion/styled'

const Container = styled.div`
	display: flex;
	flex-direction: column;
`;

const Row = styled.div`
	display: flex;
	flex-direction: row;
	margin: 5px 0;
`;

const Col = styled.div`
	display: flex;
	flex-direction: column;
	margin: 0 10px;
	:first-of-type {margin-left: 0}
	:last-child {margin-right: 0}
`;

const Title = styled.h3`
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
	justify-content: space-between;
	margin: 10px 0;
	:first-of-type {margin-top: 0}
	:last-child {margin-bottom: 0}
	& > label {margin-right: 10px}
`;

const Field = ({className, style, label, children}) =>
	<FieldContainer
		className={className}
		style={style}
	>
		<label>{label}</label>
		{typeof children === 'string'? <span>{children}</span>: children}
	</FieldContainer>

const List = ({style, className, label, children}) =>
	<Col
		style={style}
		className={className}
	>
		{label && <label>{label}</label>}
		{children}
	</Col>

const ListItemContainer = styled.div`
	display: flex;
	align-items: center;
	margin: 5px 0 0 10px;
	label {margin-left: 5px}
`;

const ListItem = ({style, className, children}) =>
	<ListItemContainer
		style={style}
		className={className}
	>
		{children}
	</ListItemContainer>

const Form = ({style, className, title, errorText, submit, submitLabel, cancel, cancelLabel, children}) => 
	<Container
		style={style}
		className={className}
	>
		{title && <Title>{title}</Title>}
		{children}
		{errorText !== undefined && <ErrMsg>{errorText || '\u00a0'}</ErrMsg>}
		<ButtonRow>
			<Button onClick={submit} >{submitLabel || 'OK'}</Button>
			<Button onClick={cancel} >{cancelLabel || 'Cancel'}</Button>
		</ButtonRow>
	</Container>

Form.propTypes = {
	submit: PropTypes.func.isRequired,
	cancel: PropTypes.func.isRequired,
	submitLabel: PropTypes.string,
	cancelLabel: PropTypes.string,
	title: PropTypes.string,
	errorText: PropTypes.string,
};

export {Form, Field, Row, Col, List, ListItem}