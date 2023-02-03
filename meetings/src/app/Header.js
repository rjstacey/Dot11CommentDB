import React from 'react';
import {NavLink, useLocation} from 'react-router-dom';
import {useSelector} from 'react-redux';

import Account from 'dot11-components/general/Account';
import Dropdown from 'dot11-components/dropdown';

import './header.css';

import {selectUser, selectUserMeetingsAccess, AccessLevel} from '../store/user';
import {selectGroupName} from '../store/groups';
import {selectCurrentSessionId} from '../store/current';

const fullMenu = [
	{
		minAccess: AccessLevel.admin,
		link: '/accounts',
		label: 'Accounts',
	},
	{
		minAccess: AccessLevel.ro,
		prefixGroupName: true,
		link: '/organization',
		label: 'Organization',
	},
	{
		minAccess: AccessLevel.ro,
		prefixGroupName: true,
		link: '/sessions',
		label: 'Sessions',
	},
	{
		minAccess: AccessLevel.ro,
		prefixGroupName: true,
		prefixSessionId: true,
		link: '/meetings',
		label: 'Meetings',
	},
	{
		minAccess: AccessLevel.ro,
		prefixGroupName: true,
		prefixSessionId: true,
		link: '/webexMeetings',
		label: 'Webex',
	},
	{
		minAccess: AccessLevel.ro,
		prefixGroupName: true,
		prefixSessionId: true,
		link: '/imatBreakouts',
		label: 'IMAT breakouts',
	},
	{
		minAccess: AccessLevel.ro,
		prefixGroupName: true,
		link: '/imatMeetings',
		label: 'IMAT sessions',
	},
	{
		minAccess: AccessLevel.ro,
		prefixGroupName: true,
		link: '/calendar',
		label: 'Calendar',
	},
	{
		minAccess: AccessLevel.ro,
		prefixGroupName: true,
		link: '/ieee802World',
		label: '802 world schedule',
	},

];

const NavItem = (props) => <NavLink className={'nav-link' + (props.isActive? ' active': '')} {...props} />

function NavMenu({className, methods}) {
	const access = useSelector(selectUserMeetingsAccess);
	const groupName = useSelector(selectGroupName);
	const sessionId = useSelector(selectCurrentSessionId);

	let classNames = 'nav-menu';
	if (className)
		classNames += ' ' + className;

	const menu = fullMenu
		.filter(m => access >= m.minAccess)
		.map(m => m.prefixSessionId? {...m, link: `/${sessionId || '*'}` + m.link}: m)
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
					dropdownRenderer={(props) => <NavMenu className='nav-menu-vertical' {...props} />}
					dropdownAlign='left'
				/>:
				<div className='title'>Meetings</div>
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
