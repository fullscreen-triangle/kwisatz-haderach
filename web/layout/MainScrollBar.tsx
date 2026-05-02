import { useEffect, useRef} from 'react';
import Scrollbar from 'smooth-scrollbar';
import {ScrollTrigger} from "gsap/dist/ScrollTrigger";
import {useDispatch} from "react-redux";
import {setScrollbar} from "../features/smooth-scrollbar/smoothScrollbarSlice";
import {ScrollbarOptions} from "smooth-scrollbar/interfaces";


interface ScrollbarOp {
    children?: JSX.Element | JSX.Element[],
    options?: ScrollbarOptions | {}
}

function MainScrollBar({children, options, ...restProps}: ScrollbarOp) {
    const ref = useRef(null);
    const dispatch = useDispatch();


    useEffect(() => {

        const scroll = Scrollbar.init(ref.current, options);

        ScrollTrigger.defaults({
            scroller: ref.current
        });

        scroll?.addListener(() => ScrollTrigger.refresh());
        dispatch(setScrollbar(scroll));


        ref.current?.style.removeProperty("overflow");
        document.body.classList.add("dsn-active-scrollbar");

        ref.current.querySelector(".scrollbar-track.scrollbar-track-x")?.remove();

        return () => {
            ScrollTrigger.defaults({
                scroller: null
            });
            scroll?.destroy();
        }

    }, [ref.current]);// eslint-disable-line react-hooks/exhaustive-deps


    return (
        <div id="dsn-scrollbar" ref={ref} style={{height: "100vh"}} {...restProps} >
            {children}
        </div>
    );
}

export default MainScrollBar;