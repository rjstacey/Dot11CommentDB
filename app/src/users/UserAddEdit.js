import PropTypes from 'prop-types'
import React from 'react'
import {connect} from 'react-redux'
import AppModal from '../modals/AppModal'
import {Form, Field} from '../general/Form'
import AccessSelector from './AccessSelector'
import {updateUser, addUser} from '../actions/users'

const EditUserAction = {CLOSED: 0, ADD: 1, UPDATE: 2}

function _UserAddEditForm({
	action,
	defaultUser,
	addUser,
	updateUser,
	close
}) {
	const [user, setUser] = React.useState(defaultUser)

	const submit = async () => {
		await (action === EditUserAction.ADD)? addUser(user): updateUser(user.SAPIN, user)
		close()
	}

	const change = e => setUser({...user, [e.target.name]: e.target.value});

	const actionText = action === EditUserAction.ADD? 'Add': 'Update';

	return (
		<Form
			title={`${actionText} user`}
			submit={submit}
			submitLabel={actionText}
			cancel={close}
			style={{width: 400}}
		>
			<Field label='SA PIN:'>
				<input type='text' size={10} name='SAPIN' value={user.SAPIN} onChange={change}/>
			</Field>
			<Field label='Name:'>
				<input type='text' size={24} name='Name' value={user.Name} onChange={change}/>
			</Field>
			<Field label='Email:'>
				<input type='text' size={24} name='Email' value={user.Email} onChange={change}/>
			</Field>
			<Field label='Access Level:' >
				<AccessSelector
					id='Access'
					value={user.Access}
					onChange={value => setUser({...user, Access: value})}
				/>
			</Field>
		</Form>
	)
}

_UserAddEditForm.propTypes = {
	action: PropTypes.number.isRequired,
	defaultUser: PropTypes.object.isRequired,
	close: PropTypes.func.isRequired,
	addUser: PropTypes.func.isRequired,
	updateUser: PropTypes.func.isRequired
}

const UserAddEditForm = connect(
	null,
	(dispatch, ownProps) => ({
		addUser: (user) => dispatch(addUser(user)),
		updateUser: (sapin, user) => dispatch(updateUser(sapin, user)),
	})
)(_UserAddEditForm)

function UserAddEditModal({
	isOpen,
	close,
	action,
	user
}) {
	return (
		<AppModal
			isOpen={isOpen}
			onRequestClose={close}
		>
			<UserAddEditForm
				key={isOpen}		// remount on open
				action={action}
				defaultUser={user}
				close={close}
			/>
		</AppModal>
	)
}

export default UserAddEditModal;
export {EditUserAction};
