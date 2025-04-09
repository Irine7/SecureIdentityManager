import { Router } from 'express'
import { approvalDetectController } from './controller'

export const approvalDetectorRouter = Router()

approvalDetectorRouter.post('/detect', approvalDetectController.detect)
