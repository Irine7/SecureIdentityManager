import { Finding } from 'forta-agent'
import { PhishingDetector } from '@/detectors/PhishingDetector'
import { CreateTransactionEvent } from '@/helpers/forta'
import { DetectionRequest } from './dtos/requests'

export class PhishingDetectionService {
    private static instance: PhishingDetectionService

    private phishingDetector: PhishingDetector

    private constructor() {
        this.phishingDetector = new PhishingDetector()
    }

    public static getInstance(): PhishingDetectionService {
        if (!PhishingDetectionService.instance) {
            PhishingDetectionService.instance = new PhishingDetectionService()
        }

        return PhishingDetectionService.instance
    }

    /**
     * Обнаруживает признаки фишинга в транзакции
     */
    async detect(request: DetectionRequest): Promise<Finding[]> {
        const transactionEvent = CreateTransactionEvent(request.trace)
        return await this.phishingDetector.handleTransaction(transactionEvent)
    }
}

export const phishingDetectionService = PhishingDetectionService.getInstance()
