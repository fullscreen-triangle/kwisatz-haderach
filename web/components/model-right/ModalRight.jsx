import {dsnCN} from "../../hooks/helper";

function ModalRight({className = "", children = null , textBtn ="" , ...restProps}) {
    return (
        <>
            <div className="contact-btn" onClick={()=>document.body.classList.toggle("dsn-show-contact")}>
                <div className="contact-btn-txt">{textBtn}</div>
            </div>
            <div className="contact-modal background-section" {...restProps}>
                <div className="contact-container h-100 w-100  border-right">
                    <div className={dsnCN("box-contact-inner", className)}>
                        {children}
                    </div>
                </div>
            </div>
        </>
    );
}

export default ModalRight;