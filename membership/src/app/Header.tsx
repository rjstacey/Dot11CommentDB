import React from 'react';
import {NavLink, useLocation} from 'react-router-dom';
import {useSelector} from 'react-redux';

import {Account, Dropdown, RendererProps} from 'dot11-components';

import './header.css';

import {selectUser, selectUserMembershipAccess, AccessLevel} from '../store/user';

const fullMenu = [
	{
		minAccess: AccessLevel.admin,
		link: '/',
		label: 'Members',
	},
	{
		minAccess: AccessLevel.admin,
		link: '/attendances',
		label: 'Session attendance',
	},
	{
		minAccess: AccessLevel.admin,
		link: '/ballotParticipation',
		label: 'Ballot participation',
	},
	{
		minAccess: AccessLevel.ro,
		link: '/sessions',
		label: 'Sessions',
	},
];

const NavItem = (props: React.ComponentProps<typeof NavLink> & {isActive?: boolean}) => <NavLink className={'nav-link' + (props.isActive? ' active': '')} {...props} />

function NavMenu({
	className,
	methods
}: {
	className?: string;
	methods?: RendererProps['methods'];
}
) {
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
	const user = useSelector(selectUser)!;
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
					selectRenderer={({state, methods}) => <div className='nav-menu-icon' onClick={state.isOpen? methods.close: methods.open}/>}
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
			<Account user={user} />
		</header>
	)
}

export default Header;
