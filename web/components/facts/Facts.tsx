import DsnGrid, {DsnGridProps} from "../../layout/DsnGrid";
import {dsnCN} from "../../hooks/helper";

function Facts({className , ...restProps} : DsnGridProps) {
    return (
        <DsnGrid className={dsnCN("facts-section p-relative over-hidden", className)} {...restProps}>
            <div className="facts-item">
                <div className="text-center p-relative">
                    <span className="number">70</span>
                    <h6 className="sm-title-block v-middle w-100">Happy Clients</h6>
                </div>
            </div>

            <div className="facts-item">
                <div className="text-center p-relative">
                    <span className="number">63</span>
                    <h6 className="sm-title-block v-middle w-100">Working hours were spent</h6>
                </div>
            </div>

            <div className="facts-item">
                <div className="text-center p-relative">
                    <span className="number">51</span>
                    <h6 className="sm-title-block v-middle w-100">Succeeded Projects</h6>
                </div>
            </div>

            <div className="facts-item">
                <div className="text-center p-relative">
                    <span className="number">13</span>
                    <h6 className="sm-title-block v-middle w-100">Finished Tearly Project</h6>
                </div>
            </div>
        </DsnGrid>
    );
}

export default Facts;