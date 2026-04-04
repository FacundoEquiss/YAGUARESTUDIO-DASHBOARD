import { Router, type IRouter } from "express";
import healthRouter from "./health";
import settingsRouter from "./settings";
import authRouter from "./auth";
import subscriptionRouter from "./subscription";
import ordersRouter from "./orders";
import clientsRouter from "./clients";
import suppliersRouter from "./suppliers";
import servicesRouter from "./services";
import transactionsRouter from "./transactions";
import feedbackRouter from "./feedback";
import financialAccountsRouter from "./financial-accounts";
import productsRouter from "./products";
import pricingRouter from "./pricing";

const router: IRouter = Router();

router.use(healthRouter);
router.use(settingsRouter);
router.use(authRouter);
router.use(subscriptionRouter);
router.use(ordersRouter);
router.use(clientsRouter);
router.use(suppliersRouter);
router.use(servicesRouter);
router.use(transactionsRouter);
router.use(financialAccountsRouter);
router.use(productsRouter);
router.use(pricingRouter);
router.use(feedbackRouter);

export default router;
