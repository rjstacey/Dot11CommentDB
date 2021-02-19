import React, {useState, useEffect} from 'react'
import {useLocation, useHistory} from 'react-router-dom'
import {connect} from 'react-redux'
import styled from '@emotion/styled'
import {Handle} from '../general/Icons'
import useClickOutside from '../lib/useClickOutside'
import {Title, Row, Col} from '../general/Form'

import {loginGetState, login, logout, AccessLevelOptions} from '../store/actions/login'

const Wrapper = styled.div`
	position: relative;
`;

const AccountButton = styled.div`
	display: flex;
	align-items: center;
	user-select: none;
	box-sizing: border-box;
	padding: 5px;
	:hover {
		color: tomato
	}
`;

const DropdownContainer = styled.div`
	position: absolute;
	right: 0;
	top: 36px;
	padding: 10px;
	min-width: 100%;
	display: flex;
	flex-direction: column;
	background: #fff;
	border: 1px solid #ccc;
	border-radius: 5px;
	box-shadow: 0 0 10px 0 rgba(0, 0, 0, 0.2);
	z-index: 9;
	overflow: auto;
	box-sizing: border-box;
	:focus {outline: none}
`;

const Button = styled.button`
	height: 36px;
	text-align: center;
	width: 100%;
	border-radius: 3px;
	cursor: pointer;
	transition: all 0.6s ease 0s;
	white-space: nowrap;
	vertical-align: middle;
	background-color: rgb(255, 255, 255);
	border: 1px solid rgb(235, 235, 235);
	color: rgb(51, 51, 51);
	font-size: 11px;
	line-height: 11px;
	font-weight: 500;
	letter-spacing: 0.02em;
	padding: 11px 12px 8px;
	text-transform: uppercase;
	:hover {background-color: #fafafa}
`;

const SignInContainer = styled.div`
	padding: 10px;
	display: flex;
	flex-direction: column;
	background: #fff;
	border: 1px solid #ccc;
	border-radius: 5px;
	box-shadow: 0 0 10px 0 rgba(0, 0, 0, 0.2);
	box-sizing: border-box;
	:focus {outline: none}
`;

const SignInForm = ({credentials, change, disabled, submit, statusMsg}) =>
	<React.Fragment>
		<Title>
			Sign in
		</Title>
		<Row>
			<Col>
				<label>Username/Email:</label>
				<input
					name="username"
					type="text"
					autoComplete="username"
					size="30"
					maxLength="100"
					value={credentials.username}
					onChange={change}
				/>
			</Col>
		</Row>
		<Row>
			<Col>
				<label>Password:</label>
				<input
					name="password"
					type="password"
					autoComplete="current-password"
					size="15"
					maxLength="30"
					value={credentials.password}
					onChange={change}
				/>
			</Col>
		</Row>
		<Row>
			<p>{statusMsg}</p>
		</Row>
		<Row>
			<Button value="Sign In" disabled={disabled} onClick={submit}>Sign in</Button>
		</Row>
	</React.Fragment>

const _SignIn = ({loading, statusMsg, user, login}) => {
	const { from } = useLocation().state || { from: { pathname: "/" } };
	const history = useHistory();
	const [credentials, setCredentials] = useState({username: '', password: ''});

	const change = e => setCredentials({...credentials, [e.target.name]: e.target.value});

	const loginSubmit = async () => {
		const user = await login(credentials.username, credentials.password)
		if (user)
			history.push(from);
	}

	return (
		<SignInContainer>
			<SignInForm
				credentials={credentials}
				change={change}
				disabled={loading}
				submit={loginSubmit}
				statusMsg={statusMsg}
			/>
		</SignInContainer>
	)
}

export const SignIn = connect(
	(state, ownProps) => {
		const {login} = state
		return {
			loading: login.loading,
			statusMsg: login.statusMsg,
			user: login.user
		}
	},
	(dispatch, ownProps) => ({
		login: (username, password) => dispatch(login(username, password))
	})
)(_SignIn);

const SignOutForm = ({user, logout, loading, close}) => {
	const submit = async () => {
		await logout();
		if (close)
			close();
	}
	return (
		<React.Fragment>
			<label>{user.Name}</label>
			<label>{user.SAPIN} {user.Username}</label>
			<label>{AccessLevelOptions.find(o => o.value === user.Access).label}</label>
			<Button value="Sign Out" disabled={loading} onClick={submit}>Sign out</Button>
		</React.Fragment>
	)
}

const AccountDropdown = ({user, logout, loading, close}) =>
	<DropdownContainer>
		<SignOutForm user={user} logout={logout} loading={loading} close={close} />
	</DropdownContainer>

function _Account(props) {
	const {loggedIn, user, loginGetState} = props;
	const [isOpen, setIsOpen] = React.useState(false);
	const close = () => setIsOpen(false)

	useEffect(() => {loginGetState()}, [loginGetState]);

	const wrapperRef = React.useRef();
	useClickOutside(wrapperRef, close);

	if (loggedIn) {
		return (
			<Wrapper
				ref={wrapperRef}
			>
				<AccountButton
					onClick={() => setIsOpen(!isOpen)}
				>
					<span>{`${user.Name} (${user.SAPIN})`}</span>
					<Handle open={isOpen} />
				</AccountButton>
				{isOpen && <AccountDropdown {...props} close={close} />}
			</Wrapper>
		)
	}
	else {
		return null
	}
}

const Account = connect(
	(state, ownProps) => {
		const {login} = state
		return {
			loading: login.loading,
			loggedIn: !!login.user,
			user: login.user,
			statusMsg: login.statusMsg,
		}
	},
	(dispatch, ownProps) => ({
		loginGetState: () => dispatch(loginGetState()),
		login: (username, password) => dispatch(login(username, password)),
		logout: () => dispatch(logout())
	})
)(_Account);

export default Account