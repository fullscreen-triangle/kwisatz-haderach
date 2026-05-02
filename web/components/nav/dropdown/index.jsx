import React, {useEffect, useRef} from "react";
import dsnSplitting from "../../../hooks/spltting";
import Link from "next/link";


const ArrowLeft = ()=><svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="30px"
                           viewBox="0 0 400.004 400.004" xmlSpace="preserve">
    <g>
        <path
            d="M382.688,182.686H59.116l77.209-77.214c6.764-6.76,6.764-17.726,0-24.485c-6.764-6.764-17.73-6.764-24.484,0L5.073,187.757 c-6.764,6.76-6.764,17.727,0,24.485l106.768,106.775c3.381,3.383,7.812,5.072,12.242,5.072c4.43,0,8.861-1.689,12.242-5.072 c6.764-6.76,6.764-17.726,0-24.484l-77.209-77.218h323.572c9.562,0,17.316-7.753,17.316-17.315 C400.004,190.438,392.251,182.686,382.688,182.686z"/>
    </g>
</svg>;

const Dropdown = ({children, name, textBack = "Back", ...restProps}) => {
    const refName = useRef();
    const refBack = useRef();


    const handleClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.closest('.open').classList.remove('open');
    }

    const handleClickSubMenu = (e) => {
        handleClick(e);
        e.currentTarget.querySelector('ul').classList.add("open");

    }

    const handleClickBackMenu = (e) => {
        handleClick(e);
        e.currentTarget.closest('ul').closest('li').closest('ul').classList.add("open");


    }


    useEffect(() => {
        dsnSplitting.Char(refName.current);
        dsnSplitting.Char(refBack.current);
    }, []);


    return (
        <li className="nav-item has-sub-menu" onClick={handleClickSubMenu}>
            <Link href="#0" {...restProps} onClick={e=>e.preventDefault()}>
                <span className="overflow">{name}</span>
            </Link>
            <ul className="sub-menu h3">
                <li className="dsn-back" onClick={handleClickBackMenu}>
                    <span>
                        <ArrowLeft/>
                        <span className="text-toggle-back">
                            <span className="text-name" ref={refName}>{name}</span>
                            <span className="text-back" ref={refBack}>{textBack}</span>
                        </span>

                    </span>
                </li>
                {children}
            </ul>
        </li>


    );
};


export default Dropdown;