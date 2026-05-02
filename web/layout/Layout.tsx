import { ElementType, HTMLProps, useEffect, useRef} from 'react';
import {dsnCN, scrollTop} from "../hooks/helper";
import dataAttr from "../hooks/dataAttr";
import SocialOne from "../components/social/SocialOne";
import MainScrollBar from "./MainScrollBar";
import ModalRight from "../components/model-right/ModalRight.jsx";


import {useSelector} from "react-redux";
import {RootState} from "../features/store";
import {ScrollbarOptions} from "smooth-scrollbar/interfaces";


interface LayoutProps {
    tag?: ElementType,
    activeScrollbar?: boolean,
    colorVersion: "dark" | "light",
    optionsScrollbar?: ScrollbarOptions | {},
    modelRight?:{
        children:any,
        propsModal : HTMLProps<HTMLButtonElement> & {textBtn?:string}
    }
}

// @ts-ignore
function Layout({className, children, tag: Tag = "div", activeScrollbar, optionsScrollbar, colorVersion , modelRight , ...restProps}
                    : LayoutProps) {

    const paginateRight = useRef(null);
    const scrollbar = useSelector((state: RootState) => state.scrollbar);

    useEffect(() => {
        const scrollDiv = document.createElement("div");
        scrollDiv.style.cssText = "width:100px;height:100px;overflow: scroll;position: absolute;top: -9999px;";
        document.body.appendChild(scrollDiv);
        document.body.style.setProperty('--dsn-width-scroll', scrollDiv.offsetWidth - scrollDiv.clientWidth + "px");

        document.body.removeChild(scrollDiv);
    }, []);

    useEffect(() => {

        const paginate = document.body.querySelectorAll("[data-dsn-title]");

        if (paginate)
            paginate.forEach(el => {
                const title = dataAttr(el, "title", false, false);
                const scrollDiv = document.createElement("div");
                scrollDiv.classList.add("dsn-link-paginate");
                scrollDiv.innerText = title.toUpperCase();
                paginateRight.current.append(scrollDiv);
                el["paginateTarget"] = scrollDiv;
                scrollDiv.addEventListener('click', (e) => {
                    e.preventDefault();
                    scrollTop({element: el, scrollbar, duration: -80});
                });
            });


        return () => {
            if (paginate)
                paginate.forEach(el => el["paginateTarget"]?.remove());
        }

    }, [scrollbar]);


    return (
        <Tag id="main_layout"
             className={dsnCN( 'background-main', className)} {...restProps}>
            <div className={dsnCN("main-content", activeScrollbar && "dsn-main-scrollbar")}>
                {activeScrollbar ? <MainScrollBar options={optionsScrollbar}><div id="main-content" className="p-relative">{children}</div></MainScrollBar> : <div id="main-content" className="p-relative">{children}</div>}
            </div>

            <div className="line-border-style w-100 h-100"/>
            <SocialOne/>
            <div className="dsn-paginate-right-page" ref={paginateRight}/>
            {modelRight && <ModalRight {...modelRight.propsModal}>{modelRight.children}</ModalRight>}
        </Tag>
    );
}

Layout.defaultProps = {
    colorVersion: "dark",
    activeScrollbar: true,
    optionsScrollbar: {damping: 0.085, alwaysShowTracks: true}
}

export default Layout;