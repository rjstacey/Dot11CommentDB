import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';

import { useAppSelector } from '../store/hooks';

import { Dropdown, Account, DropdownRendererProps } from 'dot11-components';

import './header.css';

import { selectUser, selectUserMeetingsAccess, AccessLevel } from '../store/user';
import { selectGroupName } from '../store/groups';
//import { selectCurrentSessionId } from '../store/current';

import PathGroupSelector from '../components/PathGroupSelector';

type MenuItem = {
	minAccess: number,
	link: string,
	label: string,
	prefixGroupName?: boolean,
	prefixSessionId?: boolean
}

const fullMenu: MenuItem[] = [
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
		link: '/',
		label: 'Meetings',
	},
	{
		minAccess: AccessLevel.ro,
		prefixGroupName: true,
		link: '/webexMeetings',
		label: 'Webex',
	},
	{
		minAccess: AccessLevel.ro,
		prefixGroupName: true,
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

const NavItem = (props: any) => <NavLink className={'nav-link' + (props.isActive? ' active': '')} {...props} />

function NavMenu({className, methods}: any) {
	const access: number = useAppSelector(selectUserMeetingsAccess);
	const groupName = useAppSelector(selectGroupName);
	//const sessionId = useAppSelector(selectCurrentSessionId);

	let classNames: string = 'nav-menu';
	if (className)
		classNames += ' ' + className;

	const menu = fullMenu
		.filter(m => access >= m.minAccess)
		//.map(m => m.prefixSessionId? {...m, link: `/${sessionId || '*'}` + m.link}: m)
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
	const user = useAppSelector(selectUser)!;
	const [isSmall, setIsSmall] = React.useState(smallScreenQuery.matches);

	React.useEffect(() => {
		const updateSmallScreen = (e: MediaQueryListEvent) => setIsSmall(e.matches);
		smallScreenQuery.addEventListener("change", updateSmallScreen);
		return () => smallScreenQuery.removeEventListener("change", updateSmallScreen);
	}, []);

	const location = useLocation();
	const menuItem = fullMenu.find(m => location.pathname.search(m.link) >= 0);
	
	return (
		<header className='header'>
			{isSmall?
				<Dropdown
					selectRenderer={({state, methods}: DropdownRendererProps) => <div className='nav-menu-icon' onClick={state.isOpen? methods.close: methods.open}/>}
					dropdownRenderer={(props: any) => <NavMenu className='nav-menu-vertical' {...props} />}
					dropdownAlign='left'
				/>:
				<div className='title'>Meetings</div>
			}
			<PathGroupSelector />
			<div className='nav-menu-container'>
				{isSmall?
					<label className='nav-link active'>{menuItem? menuItem.label: ''}</label>:
					<NavMenu className='nav-menu-horizontal' />
				}
			</div>
			<Account user={user} />
		</header>
	)
}

export default Header;
