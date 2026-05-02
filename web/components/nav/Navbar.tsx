import  {useCallback, useEffect, useRef, useState} from 'react';
import Toggle from './toggle';
import Link from "next/link";
import {dsnCN} from "../../hooks/helper";
import {LinkProps} from "next/dist/client/link";
import Dropdown from './dropdown';
import {gsap} from "gsap";
import DsnLink, {LinkDsnProps} from "../../hooks/DsnLink";

function Navbar({children, textOpen, textMenu, textClose, hamburger}) {
    const nav = useRef(null);
    const [typeNave, setTypeNave] = useState("");
    const [reserved, setReserved] = useState(false);


    const removeOpenMenu = useCallback(() => {
        nav.current.querySelectorAll('ul').forEach(item => item.classList.remove('open'));
    }, []);



    const cutterElement = () => {
        nav.current.querySelectorAll('ul').forEach((item, index) => {
            item.style.setProperty('--dsn-li-name', "dsn" + index);
            Object.keys(item.children).forEach(($key) => {
                item.children[$key].style.setProperty('--dsn-li-index', $key);

            });
        });
    }
    const resizeNav = () => {
        if (window.innerWidth > 991) {
            setTypeNave("");
            removeOpenMenu();
            setReserved(false);
        } else
            setTypeNave("dsn-hamburger");
    };



    // only runs after first render
    useEffect(() => {


        if (!hamburger) {
            window.addEventListener('resize', resizeNav);
            resizeNav();
        } else {
            setTypeNave("dsn-hamburger");
        }

        cutterElement();


            gsap.to(nav.current, {opacity:1 , delay : 1});




        return () => {
            window.removeEventListener('resize', resizeNav);

        }


    }, [hamburger]);// eslint-disable-line react-hooks/exhaustive-deps

    return (

        <header id="site_menu_header" className={dsnCN('site-header dsn-container ', typeNave)} ref={nav} style={{opacity:0}}>

            {children}

            {typeNave && <Toggle
                textOpen={textOpen}
                textMenu={textMenu}
                textClose={textClose}
                targetNav={nav}
                reserved={reserved}
                setReserved={setReserved}
                removeOpenMenu={removeOpenMenu}
            />}


        </header>

    );
}

Navbar.defaultProps = {
    textOpen: 'Open',
    textMenu: 'Menu',
    textClose: 'Close',
};


const handleClickCloseMenu = (e) => {
    e.stopPropagation();
    const parent = e.currentTarget.closest('.site-header');
    if (!parent)
        return;

    if (!parent.classList.contains("dsn-hamburger") || !parent.classList.contains("dsn-open"))
        return;

    const navToggle = parent.querySelector('.navbar-toggle');
    if (navToggle) navToggle.click();
}

export const Brand = ({children , href ,transitionPage=false, ...restProps}:LinkDsnProps) => {
    return (<div className="main-logo" onClick={handleClickCloseMenu}>
        <DsnLink href={href} transitionPage={transitionPage} {...restProps} >{children}</DsnLink>
    </div>)
};

Navbar.Brand = Brand;


export const Collapse = ({children, cover}) => {
    return (
        <nav className="main-navigation">
            {cover && (<div className="menu-cover-title header-container dsn-container">{cover}</div>)}
            {children}
        </nav>
    );
};
Navbar.Collapse = Collapse


export const Nav = ({children, className, ...restProps}) => {
    return (
        <ul id="dsn-primary-list" className={dsnCN('primary-nav h2', className)} {...restProps} >{children} </ul>
    );
};

// @ts-ignore
export const ItemLink = ({children, ...restProps}: LinkProps) => {

    return (
        <li className="nav-item" onClick={handleClickCloseMenu}>
            <Link  {...restProps}>
            <span className="overflow">
                {children}
            </span>
            </Link>
        </li>
    );
};
Nav.Link = ItemLink;

Nav.Dropdown = Dropdown;

export {
    Dropdown
}

export default Navbar;