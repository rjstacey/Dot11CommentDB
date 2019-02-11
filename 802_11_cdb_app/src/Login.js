import React from 'react';
import {connect} from 'react-redux';
import {loginGetState, login, logout} from './actions/login';

class LoginForm extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			username: '',
			password: '',
		};

		this.handleChange = this.handleChange.bind(this);
		this.handleLogin = this.handleLogin.bind(this);
		this.handleLogout = this.handleLogout.bind(this);
	}

	componentDidMount() {
		this.props.dispatch(loginGetState());
	}

	handleChange(e) {
		this.setState({[e.target.name]: e.target.value});
	}
	handleLogin(e) {
		this.props.dispatch(login(this.state.username, this.state.password))
		e.preventDefault();
	}
	handleLogout(e) {
		this.props.dispatch(logout())
		e.preventDefault();
	}
	render() {
		const login_form =
			<form onSubmit={this.handleLogin}>
				<label>
					<span>Username/Email:</span><br />
					<input
						name="username"
						type="text"
						size="30"
						maxLength="100"
						value={this.state.username}
						onChange={this.handleChange}
					/>
				</label><br />
				<label>
					<span>Password:</span><br />
					<input
						name="password"
						type="password"
						size="15"
						maxLength="30"
						value={this.state.password}
						onChange={this.handleChange}
					/>
				</label><br />
				<input type="submit" value="Sign In" disabled={this.props.InProgress} /><br />
				<p dangerouslySetInnerHTML={{__html: this.props.StatusMsg}} />
			</form>

		const logout_form =
			<form onSubmit={this.handleLogout}>
				<p>{this.props.Name} ({this.props.SAPIN})</p>
				<input type="submit" value="Sign Out" disabled={this.props.InProgress} />
			</form>

		return (
			<fieldset>
				{this.props.LoggedIn? logout_form: login_form}
			</fieldset>
		)
	}
}

function mapStateToProps(state) {
	return {
		LoggedIn: state.login.LoggedIn,
		InProgress: state.login.InProgress,
		Username: state.login.Username,
		Name: state.login.Name,
		SAPIN: state.login.SAPIN,
		StatusMsg: state.login.StatusMsg,
	}
}
export default connect(mapStateToProps)(LoginForm);