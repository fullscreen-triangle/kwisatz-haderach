import {useEffect, useRef} from "react";
import {gsap} from 'gsap';
import {dsnCN} from "../../hooks/helper";


export function AccordionItem({
                                  active,
                                  className,
                                  title,
                                  // @ts-ignore
                                  children,
                                  number
                              }: { active?: boolean, className?: string, title: string, number?: number }) {

    return (
        <div className={dsnCN("accordion__item", className)}>
            <div className={`accordion__question ${active && 'expanded'} d-flex align-items-center p-relative`}>
                {number && <span className="number">{number}</span>}
                <h4 className="sm-title-block">{title}</h4>
            </div>
            <div className={`accordion__answer ${active && 'active'}`}>
                {children}
            </div>
        </div>
    );
}

function Accordion({duration = 0.4 , className, children}) {

    const accordion = useRef(null);

    useEffect(() => {
        let activeIndex: number;


        const items = accordion.current.querySelectorAll('.accordion__item');
        if (!items)
            return;

        const closeAccording = ($element) => {
            const {question, answer} = $element.dsnAccording;

            gsap.set(answer, {height: "auto", display: "block", overflow: "hidden"});
            gsap.to(answer, {
                height: 0,
                paddingTop: 0,
                overflow: "hidden",
                display: "block",
                duration,
                clearProps: "paddingTop,height,overflow,display",
                onComplete() {
                    answer.classList.remove('active');
                    question.classList.remove('expanded');
                }
            });

        }
        const openAccording = ($element) => {
            const {question, answer, style} = $element.dsnAccording;


            gsap.set(answer, {height: 0, display: "block", overflow: "hidden", paddingTop: 0});

            gsap.to(answer, {
                height: style.height,
                duration,
                paddingTop: style.paddingTop,
                clearProps: "paddingTop,height,overflow,display",
                onComplete() {
                    answer.classList.add('active');
                    question.classList.add('expanded');
                }
            });


        }

        items.forEach(($item, $index) => {
            const question = $item.querySelector('.accordion__question');
            const answer = $item.querySelector('.accordion__answer');
            answer.style.display = "block";
            $item.dsnAccording = {
                question, answer, style: {
                    height: answer.getBoundingClientRect().height,
                    paddingTop: window.getComputedStyle(answer).paddingTop
                }
            };
            answer.style.display = "";

            if (question?.classList.contains('expanded') && activeIndex === undefined)
                activeIndex = $index;
            else {
                question?.classList.remove('expanded');
                answer?.classList.remove('active');
            }

            question.addEventListener('click', function () {
                if (activeIndex === $index)
                    return;

                if (activeIndex !== undefined)
                    closeAccording(items[activeIndex]);

                openAccording($item);

                activeIndex = $index;
            });

        });

        return () => {
            items.forEach($item => {
                    const {dsnAccording} = $item;
                    dsnAccording.question.replaceWith(dsnAccording.question.cloneNode(true))
                    delete $item.dsnAccording;
                }
            );
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);



    return (
        <div className={dsnCN("dsn-accordion accordion" , className)} ref={accordion}>
            <div className="accordion__wrapper">
                {children}
            </div>
        </div>
    );
}


Accordion.item = AccordionItem;


export default Accordion;