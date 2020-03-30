import React, {useState, useEffect} from 'react'
import {connect} from 'react-redux'
import {loginGetState, login, logout} from '../actions/login'

function LoginForm(props) {
	const [credentials, setCredentials] = useState({username: '', password: ''})

	// useEffect with an empty array will be called once on component mount
	useEffect(() => {
		if (!props.valid) {
			props.dispatch(loginGetState());
		}
	}, [])

	function change(e) {
		setCredentials({...credentials, [e.target.name]: e.target.value});
	}

	function loginSubmit(e) {
		e.preventDefault()
		props.dispatch(login(credentials.username, credentials.password))
	}

	function logoutSubmit(e) {
		e.preventDefault()
		props.dispatch(logout())
	}

	const login_form =
		<form onSubmit={loginSubmit} style={{display: 'inline-block', width: '300px'}}>
			<label>
				<span>Username/Email:</span><br />
				<input
					name="username"
					type="text"
					autoComplete="username"
					size="30"
					maxLength="100"
					value={credentials.username}
					onChange={change}
				/>
			</label><br />
			<label>
				<span>Password:</span><br />
				<input
					name="password"
					type="password"
					autoComplete="current-password"
					size="15"
					maxLength="30"
					value={credentials.password}
					onChange={change}
				/>
			</label><br />
			<input type="submit" value="Sign In" disabled={props.InProgress} /><br />
			<p dangerouslySetInnerHTML={{__html: props.StatusMsg}} />
		</form>

	const logout_form =
		<form onSubmit={logoutSubmit} style={{display: 'inline-block', width: '300px'}}>
			<p>{props.Name} ({props.SAPIN})</p>
			<input type="submit" value="Sign Out" disabled={props.InProgress} />
		</form>

	return (
		<div style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
			<fieldset>
				{props.LoggedIn? logout_form: login_form}
			</fieldset>
		</div>
	)
}

function mapStateToProps(state) {
	const {login} = state;
	return {
		valid: login.valid,
		LoggedIn: login.LoggedIn,
		InProgress: login.InProgress,
		Username: login.Username,
		Name: login.Name,
		SAPIN: login.SAPIN,
		StatusMsg: login.StatusMsg,
	}
}
export default connect(mapStateToProps)(LoginForm);