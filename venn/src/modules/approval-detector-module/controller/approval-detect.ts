import { Request, Response } from 'express'
import { plainToInstance } from 'class-transformer'

import { DetectionRequest } from '../dtos/requests'
import { toDetectionResponse, DetectionResponse } from '../dtos/responses'
import { approvalDetectionService } from '../service-approval'
import { validateRequest } from '@/helpers/validation.helpers'
import { ErrorHandler } from '@/helpers/error.helpers'

/**
 * Контроллер для обнаружения подозрительных разрешений
 */
export const detect = async (req: Request, resp: Response) => {
    const request = plainToInstance(DetectionRequest, req.body)

    try {
        await validateRequest(request)

        const findings = await approvalDetectionService.detect(request)
        const response: DetectionResponse = { findings }

        resp.json(toDetectionResponse(response))
    } catch (error) {
        ErrorHandler.processApiError(resp, error)
    }
}
