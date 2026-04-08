const router = require("express").Router();
const userRoute = require("../controllers/userController"); 

router.get("/",  userRoute.getAllUsers);
router.post("/", userRoute.createUser);

router.get("/:id",    userRoute.getUserById);
router.patch("/:id", userRoute.updateUser);
router.delete("/:id", userRoute.deleteUser);

module.exports = router;