import React from 'react';

var axios = require('axios');

export default class LoginForm extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      logged_in: false,
      username: '',
      password: '',
      status: ''
    };

    this.handleChange = this.handleChange.bind(this);
    this.handleLogin = this.handleLogin.bind(this);
    this.handleLogout = this.handleLogout.bind(this);
  }

  handleChange(event) {
    this.setState({[event.target.name]: event.target.value});
  }
  handleLogin(event) {
    //alert('A name/password was submitted: ' + this.state.username + '  ' + this.state.password);

    axios.post('/login', {'username': this.state.username, 'password': this.state.password, 'tz': 420})
      .then((response) => {
          console.log(response);
          if (response.data.status !== 'OK') {
            this.setState({'status': response.data.message});
          }
          else {
            this.setState({logged_in: true, status: response.data.data.name});
          }
        })
      .catch((error) => {console.log(error)});
    event.preventDefault();
  }
  handleLogout(event) {
    axios.post('/logout')
      .then((response) => {
          console.log(response);
          if (response.data.status !== 'OK') {
            this.setState({'status': response.data.message});
          }
          else {
            this.setState({logged_in: false, username: '', password: '', status: ''});
          }
        })
      .catch((error) => {console.log(error)});
    event.preventDefault();
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
            onChange={this.handleChange} />
        </label><br />
        <label>
          <span>Password:</span><br />
          <input
            name="password"
            type="password"
            size="15"
            maxLength="30"
            value={this.state.password}
            onChange={this.handleChange} />
        </label><br />
        <input type="submit" value="Sign In" /><br />
        <p dangerouslySetInnerHTML={{__html: this.state.status}} />
      </form>

    const logout_form =
      <form onSubmit={this.handleLogout}>
        <p>{this.state.status}</p>
        <input type="submit" value="Sign Out" />
      </form>

    return (
      <fieldset {...this.props}>
        {this.state.logged_in? logout_form: login_form}
      </fieldset>
      )
  }
}
