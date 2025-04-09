import { Finding } from 'forta-agent'
import { MultisigProtectionDetector } from '@/detectors/MultisigProtectionDetector'
import { CreateTransactionEvent } from '@/helpers/forta'
import { DetectionRequest } from './dtos/requests'

export class MultisigProtectionService {
    private static instance: MultisigProtectionService

    private multisigDetector: MultisigProtectionDetector

    private constructor() {
        this.multisigDetector = new MultisigProtectionDetector()
    }

    public static getInstance(): MultisigProtectionService {
        if (!MultisigProtectionService.instance) {
            MultisigProtectionService.instance = new MultisigProtectionService()
        }

        return MultisigProtectionService.instance
    }

    /**
     * Обнаруживает признаки проблем с мультиподписями в транзакции
     */
    async detect(request: DetectionRequest): Promise<Finding[]> {
        const transactionEvent = CreateTransactionEvent(request.trace)
        return await this.multisigDetector.handleTransaction(transactionEvent)
    }
}

export const multisigProtectionService = MultisigProtectionService.getInstance()
