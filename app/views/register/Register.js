import React, {
  Component,
  PropTypes
}                     from 'react';
import cx             from 'classnames';
import shallowCompare from 'react-addons-shallow-compare';
import { Link }       from 'react-router';
import {
  ErrorAlert,
  WarningAlert
}                     from '../../components';

class Register extends Component {

  state = {
    animated: true,
    viewEntersAnim: true,

    email: '',
    password: '',

    warning: null
  };

  componentDidMount() {
    const { enterRegister } = this.props;
    enterRegister();
  }

  shouldComponentUpdate(nextProps, nextState) {
    return shallowCompare(this, nextProps, nextState);
  }

  componentWillUnmount() {
    const { leaveRegister } = this.props;
    leaveRegister();
  }

  render() {
    const {
      animated,
      viewEntersAnim,
      email,
      password,
      warning
    } = this.state;

    const {
      loading,
      error
    } = this.props;

    return(
      <div className={
        cx({
          'animatedViews': animated,
          'view-enter': viewEntersAnim
        })}>
        <div className="row">
          <div className="col-md-4 col-md-offset-4">
            <form
              className="form-horizontal"
              noValidate>
              <fieldset>
                <legend>
                  Register
                </legend>
                <div className="form-group">
                  <label
                    htmlFor="inputEmail"
                    className="col-lg-2 control-label">
                    Email
                  </label>
                  <div className="col-lg-10">
                    <input
                      type="text"
                      className="form-control"
                      id="inputEmail"
                      placeholder="Email"
                      value={email}
                      onChange={this.handlesOnEmailChange}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label
                    htmlFor="inputPassword"
                    className="col-lg-2 control-label">
                    Password
                  </label>
                  <div className="col-lg-10">
                    <input
                      type="password"
                      className="form-control"
                      id="inputPassword"
                      placeholder="Password"
                      value={password}
                      onChange={this.handlesOnPasswordChange}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <div className="col-lg-10 col-lg-offset-2">
                    <Link
                      className="btn btn-default"
                      to={'/'}>
                      Cancel
                    </Link>
                    <button
                      className="btn btn-primary register-button"
                      disabled={loading}
                      onClick={this.handlesOnRegister}>
                      Register
                    </button>
                  </div>
                </div>
              </fieldset>
            </form>
            <div style={{height: '150px'}}>
              <WarningAlert
                showAlert={!!warning}
                warningTitle={'Warning'}
                warningMessage={warning ? warning.message : ''}
                onClose={this.closeWarning}
              />
              <ErrorAlert
                showAlert={!!error}
                errorTitle={'Error'}
                errorMessage={error ? error.message : ''}
                onClose={this.closeError}
              />
            </div>
          </div>
        </div>

      </div>
    );
  }

  handlesOnEmailChange = (event) => {
    event.preventDefault();
    // should add some validator before setState in real use cases
    const email = event.target.value;
    this.setState({ email});
  }

  handlesOnPasswordChange = (event) => {
    event.preventDefault();
    // should add some validator before setState in real use cases
    this.setState({ password: event.target.value });
  }

  handlesOnRegister = (event) => {
    event.preventDefault();
    const { registerUser } = this.props;
    const { email, password } = this.state;
    const { router } = this.context;

    const variables = {
      user: {
        username: email,
        password: password
      }
    };

    const { resetError } = this.props;
    resetError();
    this.setState({ warning: null });

    if (!this.isValidEmail(email)) {
      this.setState({ warning: { message: 'Email is not valid.' } });
      return;
    }

    if (!this.isValidPassword(password)) {
      this.setState({ warning: { message: 'Password is empty or not valid.' } });
      return;
    }

    registerUser({variables})
      .then(
        () => router.push({ pathname: '/protected' })
      )
      .catch(
        (err) => console.log('register user went wrong..., ', err)
      );
  }

  isValidEmail(email = '') {
    // basic validation, better user "validate.js" for real validation
    if (email && email.trim().length > 0) {
      return true;
    }
    return false;
  }

  isValidPassword(password = '') {
    // basic validation, better user "validate.js" for real validation
    if (password && password.trim().length > 0) {
      return true;
    }
    return false;
  }

  closeError = (event) => {
    event.preventDefault();
    const { resetError } = this.props;
    resetError();
  }

  closeWarning = event => {
    event.preventDefault();
    this.setState({ warning: null });
  }
}

Register.propTypes= {
  // views props:
  currentView:    PropTypes.string.isRequired,
  enterRegister:  PropTypes.func.isRequired,
  leaveRegister:  PropTypes.func.isRequired,
  // auth props:
  userIsAuthenticated: PropTypes.bool.isRequired,
  loading: PropTypes.bool.isRequired,
  error: PropTypes.object,

  // apollo actions
  registerUser: PropTypes.func.isRequired,
  resetError: PropTypes.func.isRequired
};

Register.contextTypes = {
  router: React.PropTypes.object.isRequired
};

export default Register;
