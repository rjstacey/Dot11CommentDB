import React, {useState, useEffect} from 'react'
import {connect} from 'react-redux'
import styled from '@emotion/styled'
import {loginGetState, login, logout, AccessLevelOptions} from '../actions/login'
import {Handle} from '../general/Icons'
import ClickOutside from '../general/ClickOutside'
import {Row, Col} from '../general/Form'

const Wrapper = styled(ClickOutside)`
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

const LoginForm = ({loading, statusMsg, login}) => {
	const [credentials, setCredentials] = useState({username: '', password: ''})
	const change = e => setCredentials({...credentials, [e.target.name]: e.target.value});
	const loginSubmit = e => login(credentials.username, credentials.password);

	return (
		<React.Fragment>
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
				<Button value="Sign In" disabled={loading} onClick={loginSubmit}>Sign in</Button>
			</Row>
			<Row>
				<p>{statusMsg}</p>
			</Row>
		</React.Fragment>
	)
}

const LogoutForm = ({user, loading, logout}) =>
	<React.Fragment>
		<label>{user.Name}</label>
		<label>{user.SAPIN} {user.Username}</label>
		<label>{AccessLevelOptions.find(o => o.value === user.Access).label}</label>
		<Button value="Sign Out" disabled={loading} onClick={logout}>Sign out</Button>
	</React.Fragment>

const Dropdown = (props) => 
	<DropdownContainer>
		{props.loggedIn? <LogoutForm {...props}/>: <LoginForm {...props}/>}
	</DropdownContainer>

function _Account(props) {
	const {loggedIn, user, loginGetState} = props;
	const containerRef = React.useRef();
	const [open, setOpen] = React.useState(false);

	useEffect(() => {loginGetState()}, []);

	return (
		<Wrapper
			ref={containerRef}
			onClickOutside={() => setOpen(false)}
		>
			<AccountButton
				onClick={() => setOpen(!open)}
			>
				<span>{loggedIn? `${user.Name} (${user.SAPIN})`:'Sign in'}</span>
				<Handle open={open} />
			</AccountButton>
			{open && <Dropdown {...props} />}
		</Wrapper>
	)
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