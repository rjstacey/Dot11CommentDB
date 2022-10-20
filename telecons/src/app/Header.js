import React from 'react';
import {NavLink, useLocation} from 'react-router-dom';
import {useSelector} from 'react-redux';

import Account from 'dot11-components/general/Account';
import {AccessLevel} from 'dot11-components/lib/user';
import Dropdown from 'dot11-components/dropdown';

import './header.css';

import {selectUser} from '../store/user';
import {selectGroupName} from '../store/groups';

const fullMenu = [
	{
		minAccess: AccessLevel.WGAdmin,
		link: '/accounts',
		label: 'Accounts',
	},
	{
		minAccess: AccessLevel.WGAdmin,
		prefixGroupName: true,
		link: '/organization',
		label: 'Organization',
	},
	{
		minAccess: AccessLevel.WGAdmin,
		prefixGroupName: true,
		link: '/sessions',
		label: 'Sessions',
	},
	{
		minAccess: AccessLevel.WGAdmin,
		prefixGroupName: true,
		link: '/meetings',
		label: 'Meetings',
	},
	{
		minAccess: AccessLevel.WGAdmin,
		prefixGroupName: true,
		link: '/webexMeetings',
		label: 'Webex',
	},
	{
		minAccess: AccessLevel.WGAdmin,
		prefixGroupName: true,
		link: '/imatMeetings',
		label: 'IMAT',
	},
	{
		minAccess: AccessLevel.WGAdmin,
		prefixGroupName: true,
		link: '/calendar',
		label: 'Calendar',
	},
	{
		minAccess: AccessLevel.WGAdmin,
		prefixGroupName: true,
		link: '/ieee802WorldSchedule',
		label: '802 world schedule',
	},

];

const NavItem = (props) => <NavLink className={'nav-link' + (props.isActive? ' active': '')} {...props} />

function NavMenu({className, access, methods}) {
	const groupName = useSelector(selectGroupName);

	let classNames = 'nav-menu';
	if (className)
		classNames += ' ' + className;

	const menu = fullMenu
		.filter(m => access >= m.minAccess)
		.map(m => m.prefixGroupName? {...m, link: `/${groupName || '*'}` + m.link}: m);

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
					dropdownRenderer={(props) => <NavMenu className='nav-menu-vertical' access={user.Access} {...props} />}
					dropdownAlign='left'
				/>:
				<div className='title'>Meetings</div>
			}
			<div className='nav-menu-container'>
				{isSmall?
					<label className='nav-link active'>{menuItem? menuItem.label: ''}</label>:
					<NavMenu className='nav-menu-horizontal' access={user.Access} />
				}
			</div>
			<Account className='account' user={user} />
		</header>
	)
}

export default Header;
