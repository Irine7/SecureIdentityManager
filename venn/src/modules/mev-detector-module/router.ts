import { Router } from 'express'
import { mevDetectController } from './controller'

export const mevDetectorRouter = Router()

mevDetectorRouter.post('/detect', mevDetectController.detect)
