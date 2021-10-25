const router = require('express').Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const CryptoJS = require("crypto-js")

// REGISTER
router.post("/signup", async (req, res) => {
    const reqData = req.body;
    const newUser = new User({
        username: reqData.username,
        email: reqData.email,
        password: CryptoJS.AES.encrypt(reqData.password, process.env.PUBLIC_KEY).toString()
    })

    try {
        // Save user
        const result = await newUser.save();
        res.status(201).json(result)
    } catch (error) {
        res.status(500).json(error);
    }
})

// LOGIN
router.post("/login", async (req, res) => {
    const reqData = req.body;
    try {
        // Find user
        const user = await User.findOne({ username: reqData.username });
        !user && res.status(401).json("Wrong credentials!")

        // Compare with hashed password
        const hashedPassword = CryptoJS.AES.decrypt(user.password, process.env.PUBLIC_KEY);
        const decryptedPassword = hashedPassword.toString(CryptoJS.enc.Utf8);
        decryptedPassword !== reqData.password && res.status(401).json("Wrong credentials!");

        // Implement JWT
        const accessToken = jwt.sign(
            {
                id: user._id,
                isAdmin: user.isAdmin
            },
            process.env.JWT_SEC,
            { expiresIn: "1d" }
        );

        // Login successfully
        const { password, ...other } = user._doc;
        res.status(200).json({ ...other, accessToken });
    } catch (error) {
        res.status(500).json(error);
    }
})

module.exports = router;