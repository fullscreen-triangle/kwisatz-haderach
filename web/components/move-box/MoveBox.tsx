import  {useEffect, useRef} from 'react';
import MoveTrigger, {MoveTriggerProps} from "../../animation/MoveTrigger";

import {dsnCN} from "../../hooks/helper";

interface MoveBoxProps extends MoveTriggerProps {
    bgColor?: 'main' | 'section' | 'theme',
    free?: boolean,
    className?: string,
}


function MoveBox({bgColor, free, className, children, ...restProps}: MoveBoxProps) {
    const refEl = useRef<HTMLDivElement>(null);


    useEffect(() => {
        const parentEl = refEl.current.closest('.section-margin');
        if (parentEl)
            parentEl.classList.add('section-margin-move');
    }, []);// eslint-disable-line react-hooks/exhaustive-deps

    return (
        <MoveTrigger {...restProps}>
            {
                (ref) =>
                    <div className={dsnCN('dsn-move-section', !free && 'p-relative', className)} ref={ref} >
                        <div className={`inner-box background-${bgColor}`} ref={refEl}>
                            {children}
                        </div>

                    </div>
            }

        </MoveTrigger>

    );
}

MoveBox.defaultProps = {
    bgColor: 'section',
    free: true,
    from: {y: 100},
    to: {y: -100},
    ease: "none",
    start: "100%",
    end: "0%",
    scrub: true,
    markers: false,
    stagger: null,
    tablet: false,
    mobile: false
}

export default MoveBox;