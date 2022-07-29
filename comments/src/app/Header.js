import React from 'react';
import {NavLink, useLocation} from 'react-router-dom';

import Account from 'dot11-components/general/Account';
import {AccessLevel} from 'dot11-components/lib/user';
import Dropdown from 'dot11-components/dropdown';

import LiveUpdateSwitch from './LiveUpdateSwitch';
import OnlineIndicator from './OnlineIndicator';

import './header.css';

const fullMenu = [
	{
		minAccess: AccessLevel.Public,
		link: '/ballots',
		label: 'Ballots',
	},
	{
		minAccess: AccessLevel.WGAdmin,
		link: '/voters',
		label: 'Ballot voters',
	},
	{
		minAccess: AccessLevel.SubgroupAdmin,
		link: '/results',
		label: 'Results',
	},
	{
		minAccess: AccessLevel.Public,
		link: '/comments',
		label: 'Comments',
	},
	{
		minAccess: AccessLevel.Public,
		link: '/reports',
		label: 'Reports',
	},
];

const NavItem = (props) => <NavLink className={'nav-link' + (props.isActive? ' active': '')} {...props} />

function NavMenu({className, access, methods}) {
	let classNames = 'nav-menu';
	if (className)
		classNames += ' ' + className;

	const menu = fullMenu.filter(m => access >= m.minAccess);

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

function Header({user, access}) {
	const [isSmall, setIsSmall] = React.useState(smallScreenQuery.matches);

	React.useEffect(() => {
		const updateSmallScreen = (e) => setIsSmall(e.matches);
		smallScreenQuery.addListener(updateSmallScreen);
		return () => smallScreenQuery.removeListener(updateSmallScreen);
	}, []);

	const location = useLocation();
	const menuItem = fullMenu.find(m => location.pathname.search(m.link) >=0)
	
	return (
		<header className='header'>
			{isSmall?
				<Dropdown
					selectRenderer={({isOpen, open, close}) => <div className='nav-menu-icon' onClick={isOpen? close: open}/>}
					dropdownRenderer={(props) => <NavMenu className='nav-menu-vertical' access={access} {...props} />}
					dropdownAlign='left'
				/>:
				<div className='title'>802.11 CR</div>
			}
			<div className='nav-menu-container'>
				{isSmall?
					<label className='nav-link active'>{menuItem? menuItem.label: ''}</label>:
					<NavMenu className='nav-menu-horizontal' access={access} />
				}
			</div>
			<OnlineIndicator className='online-indicator' />
			<LiveUpdateSwitch className='live-update' />
			<Account className='account' user={user} />
		</header>
	)
}

export default Header;
