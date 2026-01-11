import express from "express";
import { activate, signIn, Signup } from '../Controllers/AuthControllers.js'

const router  = express.Router()

router.post('/signup', Signup)
router.get('/activate/:activationCode', activate)
router.post('/signin', signIn)

export default router;