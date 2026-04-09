const router = require("express").Router();
const userRoute = require("../controller/addUserController"); 

router.get("/",  userRoute.getAllUsers);
router.post("/", userRoute.createUser);
router.post("/login", userRoute.login);
router.get("/:id",    userRoute.getUserById);
router.patch("/:id", userRoute.updateUser);
router.delete("/:id", userRoute.deleteUser);

module.exports = router;