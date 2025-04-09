import { Finding } from 'forta-agent'
import { MEVDetector } from '@/detectors/MEVDetector'
import { CreateTransactionEvent } from '@/helpers/forta'
import { DetectionRequest } from './dtos/requests'

export class MEVDetectionService {
    private static instance: MEVDetectionService

    private mevDetector: MEVDetector

    private constructor() {
        this.mevDetector = new MEVDetector()
    }

    public static getInstance(): MEVDetectionService {
        if (!MEVDetectionService.instance) {
            MEVDetectionService.instance = new MEVDetectionService()
        }

        return MEVDetectionService.instance
    }

    /**
     * Обнаруживает признаки MEV-атак в транзакции
     */
    async detect(request: DetectionRequest): Promise<Finding[]> {
        const transactionEvent = CreateTransactionEvent(request.trace)
        return await this.mevDetector.handleTransaction(transactionEvent)
    }
}

export const mevDetectionService = MEVDetectionService.getInstance()
