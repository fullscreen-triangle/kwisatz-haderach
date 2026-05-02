import {dsnCN} from "../../hooks/helper";
import {useEffect, useRef, useState} from "react";
import {gsap} from "gsap";
import {backgroundColor} from "../../hooks/EremiaType";


interface SkillCircleItemProps {
    number: number,
    className?: string,
    children?: any,
    bgColor?: backgroundColor | "pattern"


}

function SCI({className, bgColor, children, number, ...restProps}: SkillCircleItemProps) {
    const ref = useRef();
    const [width, setWidth] = useState(0);


    useEffect(() => {

        if (number == null)
            return;

        const animate = gsap.to(ref.current, 1.5, {
            strokeDashoffset: (100 - number),
            scrollTrigger: {
                trigger: ref.current,
                start: "top 95%",
            },
            onUpdate() {
                setWidth(Math.floor((this.progress() * number)));
            },
            onComplete() {
                if (!this.vars.scrollTrigger.scrub) {
                    this.scrollTrigger.kill();
                    this.kill();
                }
            }
        });


        return () => {
            animate?.scrollTrigger?.kill();
            animate?.kill();
        };
    }, [number]);


    return (
        <div className={dsnCN("skills-inner", className)} {...restProps}>

            <div className="bar-svg">
                <div className={`fill-bar p-relative ${bgColor}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1 34 34">
                        <circle cx="16" cy="16" r="15.9155" className="progress-bar__background"/>
                        <circle cx="16" cy="16" r="15.9155"
                                className="progress-bar__progress js-progress-bar dsn-animate-skill" ref={ref}
                                style={{strokeDashoffset: 100}}/>
                    </svg>
                    <h4 className="dsn-number-award number title-block v-middle">{width}%</h4>
                </div>

                <h5 className="dsn-title-award title-block mt-30">{children}</h5>

            </div>

        </div>


    );
}


SCI.defaultProps = {
    bgColor: "background-heading"
}

export default SCI;


