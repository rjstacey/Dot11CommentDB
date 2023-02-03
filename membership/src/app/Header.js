import React from 'react';
import {NavLink, useLocation} from 'react-router-dom';
import {useSelector} from 'react-redux';

import Account from 'dot11-components/general/Account';
import Dropdown from 'dot11-components/dropdown';

import './header.css';

import {selectUser, selectUserMembershipAccess, AccessLevel} from '../store/user';

const fullMenu = [
	{
		minAccess: AccessLevel.admin,
		link: '/members',
		label: 'Members',
	},
	{
		minAccess: AccessLevel.ro,
		link: '/sessions',
		label: 'Sessions',
	},
];

const NavItem = (props) => <NavLink className={'nav-link' + (props.isActive? ' active': '')} {...props} />

function NavMenu({className, methods}) {
	const access = useSelector(selectUserMembershipAccess);

	let classNames = 'nav-menu';
	if (className)
		classNames += ' ' + className;

	const menu = fullMenu
		.filter(m => access >= m.minAccess);

	return (
		<nav
			className={classNames}
			onClick={methods? methods.close: undefined}		// If a click bubbles up, close the dropdown
		>
			{menu.map(m => <NavItem key={m.link} to={m.link}>{m.label}</NavItem>)}
		</nav>
	)
}

const smallScreenQuery = window.matchMedia('(max-width: 992px');

function Header() {
	const user = useSelector(selectUser);
	const [isSmall, setIsSmall] = React.useState(smallScreenQuery.matches);

	React.useEffect(() => {
		const updateSmallScreen = (e) => setIsSmall(e.matches);
		smallScreenQuery.addListener(updateSmallScreen);
		return () => smallScreenQuery.removeListener(updateSmallScreen);
	}, []);

	const location = useLocation();
	const menuItem = fullMenu.find(m => location.pathname.search(m.link) >= 0);
	
	return (
		<header className='header'>
			{isSmall?
				<Dropdown
					selectRenderer={({isOpen, open, close}) => <div className='nav-menu-icon' onClick={isOpen? close: open}/>}
					dropdownRenderer={(props) => <NavMenu className='nav-menu-vertical' {...props} />}
					dropdownAlign='left'
				/>:
				<div className='title'>Membership</div>
			}
			<div className='nav-menu-container'>
				{isSmall?
					<label className='nav-link active'>{menuItem? menuItem.label: ''}</label>:
					<NavMenu className='nav-menu-horizontal' />
				}
			</div>
			<Account className='account' user={user} />
		</header>
	)
}

export default Header;
