import Link from "next/link";
import {LinkProps} from "next/link";
import {ReactNode, useEffect, useRef} from "react";
import {transitionPage} from "./EremiaType";
import {tdStart} from "./transition/transitionDefalut";
import {gsap} from "gsap";
import {useRouter} from "next/router";


export interface LinkDsnProps extends LinkProps {
    children?: ReactNode,
    transitionPage?: transitionPage,
    className?: string,
    dangerouslySetInnerHTML?: {
        __html: string;
    } | undefined
}


function DsnLink({children, className, href, transitionPage = true, ...restProps}: LinkDsnProps) {

    const ref = useRef<HTMLAnchorElement>(null);
    const router = useRouter();


    useEffect(() => {

        if (!transitionPage || !href || router.asPath === href)
            return;

        const currentLink = ref.current;
        const domTransition: { current: HTMLDivElement | null, tl: gsap.core.Timeline | null } = {
            current: null,
            tl: null
        };

        const handleClick = (e) => {
            e.preventDefault();
            if (domTransition.current !== null)
                return;

            [domTransition.current, domTransition.tl] = tdStart(transitionPage);
            domTransition.tl.call(() => {
                router.push(href);
                domTransition.tl.kill();
                domTransition.tl = null;
                domTransition.current = null;

            });

        }

        currentLink.addEventListener("click", handleClick);
        return () => {
            currentLink.removeEventListener("click", handleClick);
        }
    }, [transitionPage, router, href]);


    return <Link href={href} className={className} {...restProps} ref={ref}>{children}</Link>

}


export default DsnLink;