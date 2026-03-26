import { Router, type IRouter } from "express";
import healthRouter from "./health";
import settingsRouter from "./settings";
import authRouter from "./auth";
import subscriptionRouter from "./subscription";

const router: IRouter = Router();

router.use(healthRouter);
router.use(settingsRouter);
router.use(authRouter);
router.use(subscriptionRouter);

export default router;
