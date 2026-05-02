import {portfolioData} from "./index";

export default function handler(req, res) {
    const {slug} = req.query,
        portfolio = portfolioData.find((item) => item.slug === slug);
    res.status(200).json({portfolio});
}
