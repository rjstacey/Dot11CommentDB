import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';

import { Dropdown, Account, Button } from 'dot11-components';

import { PathWorkingGroupSelector } from './PathWorkingGroupSelector';

import './header.css';

import { resetStore } from '../store';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { selectUser, selectUserMeetingsAccess, AccessLevel } from '../store/user';
import { selectGroupName } from '../store/groups';

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
		link: '/meetings',
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
	{
		minAccess: AccessLevel.ro,
		prefixGroupName: true,
		link: '/reports',
		label: 'Reports',
	},
];

const NavItem = (props: any) => <NavLink className={'nav-link' + (props.isActive? ' active': '')} {...props} />

function NavMenu({className, methods}: any) {
	const access: number = useAppSelector(selectUserMeetingsAccess);
	const groupName = useAppSelector(selectGroupName);

	let classNames: string = 'nav-menu';
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
	const dispatch = useAppDispatch();
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
			<PathWorkingGroupSelector />

			{isSmall &&
				<Dropdown
					selectRenderer={({state, methods}) => <div className='nav-menu-icon' onClick={state.isOpen? methods.close: methods.open}/>}
					dropdownRenderer={(props: any) => <NavMenu className='nav-menu-vertical' {...props} />}
					dropdownAlign='left'
				/>
			}

			<div className='nav-menu-container'>
				{isSmall?
					<label className='nav-link active'>{menuItem? menuItem.label: ''}</label>:
					<NavMenu className='nav-menu-horizontal' />
				}
			</div>

			<Account
				user={user}
			>
				<Button
					onClick={() => dispatch(resetStore())}
				>
					Clear cache
				</Button>
			</Account>
		</header>
	)
}

export default Header;
