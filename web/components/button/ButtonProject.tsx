import {dsnCN} from "../../hooks/helper";
import Link from "next/link";
import {LinkProps} from "next/dist/client/link";


interface ButtonProps {
    className?: string,
    href: string,
    linkProps?: Object | LinkProps

}


function ButtonProject({
                           // @ts-ignore
                           className, children, href, LinkProps,

                           ...restProps
                       }: ButtonProps) {

    return (
        <Link className={dsnCN("visit-site", className)} href={href} {...LinkProps} {...restProps}>

            <span className="inner-visit d-flex align-items-center">
                <span className="text text-uppercase">{children}</span>
                <span className="icon">
                  <svg viewBox="0 0 40 40">
                    <polyline
                        className="path"
                        points="14.6 17.45 20 22.85 25.4 17.45"
                    />
                  </svg>
                </span>
              </span>
        </Link>
    );
}

export default ButtonProject;