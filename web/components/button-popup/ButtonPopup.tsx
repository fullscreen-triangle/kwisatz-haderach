import  {useEffect} from 'react';
import {Fancybox as NativeFancybox} from "@fancyapps/ui";
import {dsnCN} from "../../hooks/helper";
import {NativeFancyboxOption} from "../../hooks/EremiaType";


export interface ButtonPopupProps {
    option?: NativeFancyboxOption,
    href: string,
    className?: string,
    textBefore?: string,
    textAfter?: string,
    group?: string,
    width?: string | number,
    height?: string | number
}

function ButtonPopup({
                         href,
                         className,
                         group,
                         width,
                         height,
                         textBefore,
                         textAfter,
                         option,
                         ...restProps
                     }: ButtonPopupProps) {


    useEffect(() => {
        NativeFancybox.bind("[data-fancybox]", option || {});

        return () => {
            NativeFancybox.destroy();
        };

    }, []);// eslint-disable-line react-hooks/exhaustive-deps

    return (
        <>

            {href && <a href={href}
                        data-fancybox={group || ''}
                        data-width={width}
                        data-height={height}
                        className={dsnCN("play-btn d-flex align-items-center justify-content-center text-center vid", className)}
                        {...restProps} >
                <span className="text">{textBefore}</span>
                <span
                    className="play-icon d-flex align-items-center justify-content-center  text-center"
                    data-dsn="parallax">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none">
                        <path fill="#000"
                              d="M7 17.259V6.741a1 1 0 0 1 1.504-.864l9.015 5.26a1 1 0 0 1 0 1.727l-9.015 5.259A1 1 0 0 1 7 17.259Z"/>
                    </svg>
                 </span>

                <span className="text">{textAfter}</span>
            </a>}

        </>
    );
}


export default ButtonPopup;
