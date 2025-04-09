import { ethers } from 'ethers'
import {
    Finding,
    FindingSeverity,
    FindingType,
    getEthersProvider,
    type HandleTransaction,
    type TransactionEvent,
} from 'forta-agent'

// Сигнатура события для операций с мультиподписью
const MULTISIG_EXECUTION_TOPIC = ethers.id('ExecutionSuccess(bytes32,uint256)')
const MULTISIG_CONFIRMATION_TOPIC = ethers.id('Confirmation(address,bytes32)')
const MULTISIG_REVOCATION_TOPIC = ethers.id('RevokeConfirmation(address,bytes32)')
const OWNER_ADDITION_TOPIC = ethers.id('OwnerAddition(address)')
const OWNER_REMOVAL_TOPIC = ethers.id('OwnerRemoval(address)')
const REQUIREMENT_CHANGE_TOPIC = ethers.id('RequirementChange(uint256)')

// Известные фабрики Gnosis Safe и других популярных мультиподписей
const KNOWN_MULTISIG_FACTORIES = [
    '0xa6B71E26C5e0845f74c812102Ca7114b6a896AB2', // Gnosis Safe Factory
    '0x76E2cFc1F5Fa8F6a5b3fC4c8F4788F0116861F9B', // Gnosis Safe Factory 1.1.1
]

// Общие интерфейсы для мультиподписей
const MULTISIG_INTERFACES = {
    // Gnosis Safe
    EXECUTE: '0x6a761202', // execTransaction(address,uint256,bytes,uint8,uint256,uint256,uint256,address,address,bytes)
    GET_OWNERS: '0xa0e67e2b', // getOwners()
    GET_THRESHOLD: '0xe75235b8', // getThreshold()
    IS_OWNER: '0x2f54bf6e', // isOwner(address)
    // Общие для мультиподписей
    SUBMIT_TRANSACTION: '0xc6427474', // submitTransaction(address,uint256,bytes)
    CONFIRM_TRANSACTION: '0xc01a8c84', // confirmTransaction(uint256)
    REVOKE_CONFIRMATION: '0x20ea8d86', // revokeConfirmation(uint256)
    EXECUTE_TRANSACTION: '0xee22610b', // executeTransaction(uint256)
}

// Проверка, является ли адрес мультиподписью на основе кода контракта
async function isMultisigWallet(address: string): Promise<boolean> {
    const provider = getEthersProvider()

    try {
        const code = await provider.getCode(address)
        if (code === '0x') return false

        // Проверяем наличие характерных сигнатур функций мультиподписи
        const hasMultisigFunctions = Object.values(MULTISIG_INTERFACES).some(signature =>
            code.includes(signature.slice(2)),
        )

        return hasMultisigFunctions
    } catch (error) {
        console.error(`Error checking if ${address} is a multisig wallet:`, error)
        return false
    }
}

// Получение истории транзакций для адреса
async function getTransactionHistory(address: string, blocksBack = 1000): Promise<any[]> {
    const provider = getEthersProvider()
    const currentBlock = await provider.getBlockNumber()
    const startBlock = Math.max(0, currentBlock - blocksBack)

    // В реальном сценарии здесь был бы запрос к индексеру или API для получения транзакций
    // Это упрощенная реализация
    return []
}

/**
 * Детектор для защиты мультиподписных кошельков
 * Обнаруживает аномальные шаблоны использования или несанкционированные попытки операций
 */
export class MultisigProtectionDetector {
    // Кеш известных мультиподписей и их конфигурации для оптимизации проверок
    private multisigCache: Map<string, { owners: string[]; threshold: number }> = new Map()

    /**
     * Проверяет транзакцию на предмет аномалий в использовании мультиподписей
     */
    public async handleTransaction(txEvent: TransactionEvent) {
        const findings: Finding[] = []

        // 1. Проверяем вызовы функций мультиподписи
        const multisigCalls = txEvent.filterFunction([
            'function execTransaction(address,uint256,bytes,uint8,uint256,uint256,uint256,address,address,bytes)',
            'function confirmTransaction(uint256)',
            'function revokeConfirmation(uint256)',
            'function changeThreshold(uint256)',
            'function addOwner(address)',
            'function removeOwner(address,address,uint256)',
        ])

        // 2. Проверяем события мультиподписи
        const executionLogs = txEvent.filterLog(MULTISIG_EXECUTION_TOPIC)
        const confirmationLogs = txEvent.filterLog(MULTISIG_CONFIRMATION_TOPIC)
        const revocationLogs = txEvent.filterLog(MULTISIG_REVOCATION_TOPIC)
        const ownerAdditionLogs = txEvent.filterLog(OWNER_ADDITION_TOPIC)
        const ownerRemovalLogs = txEvent.filterLog(OWNER_REMOVAL_TOPIC)
        const requirementChangeLogs = txEvent.filterLog(REQUIREMENT_CHANGE_TOPIC)

        // Проверяем транзакции со всеми мультиподписями, затронутыми в данной транзакции
        for (const address of Object.keys(txEvent.addresses)) {
            // Проверяем, является ли адрес мультиподписью
            if (!(await isMultisigWallet(address))) continue

            // Анализируем конфигурацию мультиподписи
            await this.analyzeMutisigConfiguration(address, findings, txEvent)

            // Проверяем транзакцию на наличие подозрительных действий с мультиподписью
            await this.detectAnomalousActivity(address, findings, txEvent)

            // Проверяем операции по изменению владельцев или порога подписей
            if (
                ownerAdditionLogs.length > 0 ||
                ownerRemovalLogs.length > 0 ||
                requirementChangeLogs.length > 0
            ) {
                await this.detectOwnershipChanges(
                    address,
                    findings,
                    ownerAdditionLogs,
                    ownerRemovalLogs,
                    requirementChangeLogs,
                    txEvent,
                )
            }
        }

        return findings
    }

    /**
     * Анализирует конфигурацию мультиподписи для выявления потенциальных рисков
     */
    private async analyzeMutisigConfiguration(
        address: string,
        findings: Finding[],
        txEvent: TransactionEvent,
    ) {
        try {
            const provider = getEthersProvider()
            const multisigInterface = new ethers.Interface([
                'function getOwners() view returns (address[])',
                'function getThreshold() view returns (uint256)',
            ])

            // Получаем текущих владельцев и порог подписей
            let owners: string[] = []
            let threshold = 0

            try {
                const ownersData = await provider.call({
                    to: address,
                    data: multisigInterface.encodeFunctionData('getOwners'),
                })
                owners = multisigInterface.decodeFunctionResult('getOwners', ownersData)[0]

                const thresholdData = await provider.call({
                    to: address,
                    data: multisigInterface.encodeFunctionData('getThreshold'),
                })
                threshold = Number(
                    multisigInterface.decodeFunctionResult('getThreshold', thresholdData)[0],
                )

                // Кешируем информацию для будущих проверок
                this.multisigCache.set(address, { owners, threshold })
            } catch (error) {
                // Интерфейс может отличаться, применяем альтернативный подход или игнорируем ошибку
            }

            // Выявляем потенциальные риски в конфигурации
            if (owners.length > 0 && threshold > 0) {
                // Проверка: Слишком низкий порог подписей относительно общего числа владельцев
                if (threshold === 1 && owners.length > 2) {
                    findings.push(
                        Finding.fromObject({
                            name: 'Risky Multisig Configuration',
                            description: `Multisig wallet has a low threshold (${threshold}) compared to owner count (${owners.length})`,
                            alertId: 'MULTISIG-CONFIG-1',
                            severity: FindingSeverity.Medium,
                            type: FindingType.Suspicious,
                            metadata: {
                                multisigAddress: address,
                                threshold: threshold.toString(),
                                ownerCount: owners.length.toString(),
                            },
                        }),
                    )
                }

                // Проверка: Слишком много владельцев (потенциальная проблема координации)
                if (owners.length > 10) {
                    findings.push(
                        Finding.fromObject({
                            name: 'Complex Multisig Configuration',
                            description: `Multisig wallet has a high number of owners (${owners.length})`,
                            alertId: 'MULTISIG-CONFIG-2',
                            severity: FindingSeverity.Info,
                            type: FindingType.Info,
                            metadata: {
                                multisigAddress: address,
                                threshold: threshold.toString(),
                                ownerCount: owners.length.toString(),
                            },
                        }),
                    )
                }
            }
        } catch (error) {
            console.error(`Error analyzing multisig configuration for ${address}:`, error)
        }
    }

    /**
     * Обнаруживает аномальную активность для мультиподписи
     */
    private async detectAnomalousActivity(
        address: string,
        findings: Finding[],
        txEvent: TransactionEvent,
    ) {
        try {
            // Получаем историю транзакций для анализа паттернов
            const history = await getTransactionHistory(address)

            // Пример проверки: необычное количество отмен подтверждений
            const revocationLogs = txEvent.filterLog(MULTISIG_REVOCATION_TOPIC)
            if (revocationLogs.length > 2) {
                findings.push(
                    Finding.fromObject({
                        name: 'Unusual Multisig Activity',
                        description: `Multiple confirmation revocations (${revocationLogs.length}) in a single transaction`,
                        alertId: 'MULTISIG-ACTIVITY-1',
                        severity: FindingSeverity.Medium,
                        type: FindingType.Suspicious,
                        metadata: {
                            multisigAddress: address,
                            revocationCount: revocationLogs.length.toString(),
                            transactionHash: txEvent.hash,
                        },
                    }),
                )
            }

            // Проверка: транзакция от неизвестного адреса к мультиподписи с подозрительными данными
            if (
                txEvent.transaction.to === address &&
                txEvent.transaction.data.includes(MULTISIG_INTERFACES.EXECUTE)
            ) {
                const cachedData = this.multisigCache.get(address)
                if (
                    cachedData &&
                    !cachedData.owners.includes(txEvent.transaction.from.toLowerCase())
                ) {
                    findings.push(
                        Finding.fromObject({
                            name: 'Unauthorized Multisig Access Attempt',
                            description: `Transaction to multisig from non-owner address`,
                            alertId: 'MULTISIG-SECURITY-1',
                            severity: FindingSeverity.High,
                            type: FindingType.Suspicious,
                            metadata: {
                                multisigAddress: address,
                                sender: txEvent.transaction.from,
                                transactionHash: txEvent.hash,
                            },
                        }),
                    )
                }
            }
        } catch (error) {
            console.error(`Error detecting anomalous activity for ${address}:`, error)
        }
    }

    /**
     * Обнаруживает подозрительные изменения в составе владельцев или пороге подписей
     */
    private async detectOwnershipChanges(
        address: string,
        findings: Finding[],
        ownerAdditionLogs: any[],
        ownerRemovalLogs: any[],
        requirementChangeLogs: any[],
        txEvent: TransactionEvent,
    ) {
        // Проверка: быстрое добавление и удаление владельцев в рамках одной транзакции
        if (ownerAdditionLogs.length > 0 && ownerRemovalLogs.length > 0) {
            findings.push(
                Finding.fromObject({
                    name: 'Suspicious Multisig Ownership Changes',
                    description: `Both owner addition and removal in a single transaction`,
                    alertId: 'MULTISIG-OWNERSHIP-1',
                    severity: FindingSeverity.High,
                    type: FindingType.Suspicious,
                    metadata: {
                        multisigAddress: address,
                        additionsCount: ownerAdditionLogs.length.toString(),
                        removalsCount: ownerRemovalLogs.length.toString(),
                        transactionHash: txEvent.hash,
                    },
                }),
            )
        }

        // Проверка: снижение порога подписей (требований)
        for (const log of requirementChangeLogs) {
            const newRequirement = log.args.requirement
            const cachedData = this.multisigCache.get(address)

            if (cachedData && Number(newRequirement) < cachedData.threshold) {
                findings.push(
                    Finding.fromObject({
                        name: 'Multisig Security Reduction',
                        description: `Threshold decreased from ${cachedData.threshold} to ${newRequirement}`,
                        alertId: 'MULTISIG-THRESHOLD-1',
                        severity: FindingSeverity.High,
                        type: FindingType.Suspicious,
                        metadata: {
                            multisigAddress: address,
                            oldThreshold: cachedData.threshold.toString(),
                            newThreshold: newRequirement.toString(),
                            transactionHash: txEvent.hash,
                        },
                    }),
                )
            }
        }
    }
}
