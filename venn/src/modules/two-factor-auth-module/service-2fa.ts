import type { Finding } from 'forta-agent'

import { TwoFactorAuthDetector } from '@/detectors/TwoFactorAuthDetector'
import { CreateTransactionEvent } from '@/helpers/forta'

import type { DetectionRequest } from './dtos/requests'

export class TwoFactorAuthService {
    private static instance: TwoFactorAuthService

    private twoFactorAuthDetector: TwoFactorAuthDetector

    private constructor() {
        this.twoFactorAuthDetector = new TwoFactorAuthDetector()
    }

    public static getInstance(): TwoFactorAuthService {
        if (!TwoFactorAuthService.instance) {
            TwoFactorAuthService.instance = new TwoFactorAuthService()
        }

        return TwoFactorAuthService.instance
    }

    /**
     * Обнаруживает операции, требующие двухфакторной аутентификации
     */
    async detect(request: DetectionRequest): Promise<Finding[]> {
        const transactionEvent = CreateTransactionEvent(request.trace)
        return await this.twoFactorAuthDetector.handleTransaction(transactionEvent)
    }
}

export const twoFactorAuthService = TwoFactorAuthService.getInstance()
