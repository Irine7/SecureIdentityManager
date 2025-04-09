import { Router } from 'express'
import { twoFactorAuthController } from './controller'

export const twoFactorAuthRouter = Router()

twoFactorAuthRouter.post('/detect', twoFactorAuthController.detect)
