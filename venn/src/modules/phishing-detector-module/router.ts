import { Router } from 'express'
import { phishingDetectController } from './controller'

export const phishingDetectorRouter = Router()

phishingDetectorRouter.post('/detect', phishingDetectController.detect)
