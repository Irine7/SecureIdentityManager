import { Router } from 'express'
import { multisigDetectController } from './controller'

export const multisigProtectionRouter = Router()

multisigProtectionRouter.post('/detect', multisigDetectController.detect)
