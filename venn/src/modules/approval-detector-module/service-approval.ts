import { Finding } from 'forta-agent'
import { ApprovalDetector } from '@/detectors/ApprovalDetector'
import { CreateTransactionEvent } from '@/helpers/forta'
import { DetectionRequest } from './dtos/requests'

export class ApprovalDetectionService {
    private static instance: ApprovalDetectionService

    private approvalDetector: ApprovalDetector

    private constructor() {
        this.approvalDetector = new ApprovalDetector()
    }

    public static getInstance(): ApprovalDetectionService {
        if (!ApprovalDetectionService.instance) {
            ApprovalDetectionService.instance = new ApprovalDetectionService()
        }

        return ApprovalDetectionService.instance
    }

    /**
     * Обнаруживает подозрительные разрешения токенов в транзакции
     */
    async detect(request: DetectionRequest): Promise<Finding[]> {
        const transactionEvent = CreateTransactionEvent(request.trace)
        return await this.approvalDetector.handleTransaction(transactionEvent)
    }
}

export const approvalDetectionService = ApprovalDetectionService.getInstance()
