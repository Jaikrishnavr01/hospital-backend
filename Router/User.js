import express from "express";
import { activate, blockUser, deleteUser, getAllUsers, signIn, Signup, unblockUser, updateUser } from '../Controllers/AuthControllers.js'

const router  = express.Router()

router.post('/signup', Signup)
router.get('/activate/:activationCode', activate)
router.post('/signin', signIn)
router.put("/users/block/:id", blockUser);
router.put("/users/unblock/:id", unblockUser);
router.get("/users", getAllUsers);
router.put("/users/:id", updateUser);
router.delete("/users/:id", deleteUser);



export default router;