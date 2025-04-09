import { Router, Request, Response } from 'express'

/* IMPORT ALL YOUR ROUTERS */
import { appRouter, detectionRouter } from './modules'
import { multisigProtectionRouter } from './modules/multisig-protection-module/router'
import { phishingDetectorRouter } from './modules/phishing-detector-module/router'
import { mevDetectorRouter } from './modules/mev-detector-module/router'
import { approvalDetectorRouter } from './modules/approval-detector-module/router'
import { twoFactorAuthRouter } from './modules/two-factor-auth-module/router'

const router = Router()

/* ASSIGN EACH ROUTER TO DEDICATED SUBROUTE */
router.use('/app', appRouter)
router.use('/detect', detectionRouter)
router.use('/multisig-protection', multisigProtectionRouter)
router.use('/phishing-detection', phishingDetectorRouter)
router.use('/mev-detection', mevDetectorRouter)
router.use('/approval-detection', approvalDetectorRouter)
router.use('/two-factor-auth', twoFactorAuthRouter)

/* ROOT ROUTE HANDLER */
router.get('/', (req: Request, res: Response) => {
    // Перенаправление на домашнюю страницу модуля приложения
    const appHomeUrl = '/app';
    res.redirect(appHomeUrl);
})

export { router }
