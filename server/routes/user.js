const router = require('express').Router();
const { verifyToken, verifyTokenAndAuthorization } = require("./verifyToken");
const User = require('../models/User');
const CryptoJS = require("crypto-js")


// UPDATE USER
router.put("/:id", verifyTokenAndAuthorization, async (req, res) => {
    const reqData = req.body;

    if (reqData.password) {
        reqData.password = CryptoJS.AES.encrypt(reqData.password, process.env.PUBLIC_KEY).toString();
    }

    try {
        const updatedUser = await User.findByIdAndUpdate(
            req.params.id,
            {
                $set: req.body
            },
            { new: true }
        );
        res.status(200).json(updatedUser);
    } catch (error) {
        res.status(500).json(error);
    }

})

module.exports = router;