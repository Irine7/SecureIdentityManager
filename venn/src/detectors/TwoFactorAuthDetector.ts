import { ethers } from 'ethers'
import {
    Finding,
    FindingSeverity,
    FindingType,
    getEthersProvider,
    type HandleTransaction,
    type TransactionEvent,
} from 'forta-agent'

// Сигнатуры функций и событий для контроля 2FA
const TWO_FACTOR_AUTH_EVENT = ethers.id('AuthenticationRequired(address,bytes32,uint256)');
const TWO_FACTOR_AUTH_SUCCESS = ethers.id('AuthenticationSuccessful(address,bytes32)');
const TWO_FACTOR_AUTH_FAILED = ethers.id('AuthenticationFailed(address,bytes32,string)');

// Сигнатуры функций для высокорисковых операций
const HIGH_RISK_OPERATIONS = {
    // ERC20 операции
    TOKEN_TRANSFER: '0xa9059cbb', // transfer(address,uint256)
    TOKEN_APPROVE: '0x095ea7b3', // approve(address,uint256)
    
    // NFT операции
    NFT_TRANSFER: '0x23b872dd', // transferFrom(address,address,uint256)
    NFT_APPROVE_ALL: '0xa22cb465', // setApprovalForAll(address,bool)
    
    // DeFi операции
    SWAP_EXACT_ETH_FOR_TOKENS: '0x7ff36ab5', // swapExactETHForTokens(uint256,address[],address,uint256)
    SWAP_EXACT_TOKENS_FOR_ETH: '0x18cbafe5', // swapExactTokensForETH(uint256,uint256,address[],address,uint256)
    SEND_TRANSACTION: '0x3e54bacb', // sendTransaction((address,uint256,bytes,uint8,bytes,bytes))
    
    // Многоподписные операции
    EXECUTE_TRANSACTION: '0x6a761202', // execTransaction(address,uint256,bytes,uint8,uint256,uint256,uint256,address,address,bytes)
    
    // Операции с управлением
    DELEGATE: '0x5c19a95c', // delegate(address)
    PROTOCOL_UPGRADE: '0x3659cfe6', // upgradeTo(address)
};

// Порог высокого риска транзакций в ETH
const HIGH_RISK_VALUE_THRESHOLD = ethers.parseEther('1.0');

// Состояния транзакций, ожидающих 2FA
interface Pending2FATransaction {
    txHash: string;
    from: string;
    to: string;
    value: string;
    operationType: string;
    timestamp: number;
}

/**
 * Детектор двухфакторной аутентификации (2FA)
 * Позволяет пользователям использовать приложения-аутентификаторы
 * для подтверждения любых или высокорисковых транзакций
 */
export class TwoFactorAuthDetector {
    // Хранит транзакции, ожидающие 2FA
    private pending2FATransactions: Map<string, Pending2FATransaction> = new Map();
    
    // Хранит адреса пользователей, которые включили 2FA
    private usersWith2FA: Set<string> = new Set();
    
    // Настройки 2FA по адресам пользователей
    private user2FASettings: Map<string, {
        enabledFor: string[], // Типы операций, для которых включена 2FA
        valueThreshold: bigint, // Порог стоимости, выше которого требуется 2FA
        lastVerification: number // Временная метка последней успешной проверки 2FA
    }> = new Map();
    
    constructor() {
        // Инициализация настроек 2FA по умолчанию
        // В реальном сценарии эти настройки можно было бы загружать из базы данных
        this.initializeDefaultSettings();
    }
    
    /**
     * Анализирует транзакцию на предмет требований 2FA
     */
    public async handleTransaction(txEvent: TransactionEvent) {
        const findings: Finding[] = [];
        
        // Обрабатываем события, связанные с 2FA
        await this.process2FAEvents(txEvent, findings);
        
        // Проверяем транзакцию на необходимость 2FA
        await this.checkTransactionFor2FA(txEvent, findings);
        
        // Проверяем, выполняются ли высокорисковые операции пользователями с 2FA
        await this.checkHighRiskOperations(txEvent, findings);
        
        return findings;
    }
    
    /**
     * Обрабатывает события, связанные с 2FA
     */
    private async process2FAEvents(txEvent: TransactionEvent, findings: Finding[]) {
        // События запроса 2FA
        const authRequiredEvents = txEvent.filterLog(TWO_FACTOR_AUTH_EVENT);
        
        for (const event of authRequiredEvents) {
            const { user, operationId, timestamp } = event.args;
            
            // Сохраняем транзакцию как ожидающую 2FA
            this.pending2FATransactions.set(operationId, {
                txHash: txEvent.hash,
                from: user,
                to: txEvent.to || '',
                value: txEvent.transaction.value,
                operationType: this.identifyOperationType(txEvent),
                timestamp: Number(timestamp)
            });
            
            findings.push(
                Finding.fromObject({
                    name: '2FA Authentication Required',
                    description: `Two-factor authentication required for transaction`,
                    alertId: '2FA-REQUIRED-1',
                    severity: FindingSeverity.Info,
                    type: FindingType.Info,
                    metadata: {
                        user: user,
                        operationId: operationId,
                        timestamp: timestamp.toString(),
                        txHash: txEvent.hash
                    }
                })
            );
        }
        
        // События успешной 2FA
        const authSuccessEvents = txEvent.filterLog(TWO_FACTOR_AUTH_SUCCESS);
        
        for (const event of authSuccessEvents) {
            const { user, operationId } = event.args;
            
            // Обновляем время последней успешной проверки 2FA
            const userSettings = this.user2FASettings.get(user.toLowerCase());
            if (userSettings) {
                userSettings.lastVerification = Math.floor(Date.now() / 1000);
                this.user2FASettings.set(user.toLowerCase(), userSettings);
            }
            
            // Удаляем транзакцию из списка ожидающих
            this.pending2FATransactions.delete(operationId);
            
            findings.push(
                Finding.fromObject({
                    name: '2FA Authentication Successful',
                    description: `Two-factor authentication successful for operation`,
                    alertId: '2FA-SUCCESS-1',
                    severity: FindingSeverity.Info,
                    type: FindingType.Info,
                    metadata: {
                        user: user,
                        operationId: operationId,
                        txHash: txEvent.hash
                    }
                })
            );
        }
        
        // События неуспешной 2FA
        const authFailedEvents = txEvent.filterLog(TWO_FACTOR_AUTH_FAILED);
        
        for (const event of authFailedEvents) {
            const { user, operationId, reason } = event.args;
            
            findings.push(
                Finding.fromObject({
                    name: '2FA Authentication Failed',
                    description: `Two-factor authentication failed: ${reason}`,
                    alertId: '2FA-FAILED-1',
                    severity: FindingSeverity.Medium,
                    type: FindingType.Suspicious,
                    metadata: {
                        user: user,
                        operationId: operationId,
                        reason: reason,
                        txHash: txEvent.hash
                    }
                })
            );
        }
    }
    
    /**
     * Проверяет, требует ли транзакция двухфакторной аутентификации
     */
    private async checkTransactionFor2FA(txEvent: TransactionEvent, findings: Finding[]) {
        const sender = txEvent.from.toLowerCase();
        
        // Проверяем, включена ли 2FA для пользователя
        if (!this.usersWith2FA.has(sender)) return;
        
        const settings = this.user2FASettings.get(sender);
        if (!settings) return;
        
        // Проверяем стоимость транзакции
        const txValue = BigInt(txEvent.transaction.value);
        const valueThreshold = settings.valueThreshold;
        
        // Определяем тип операции
        const operationType = this.identifyOperationType(txEvent);
        
        // Проверяем, требуется ли 2FA для этой операции
        const requires2FA = (
            settings.enabledFor.includes('all') || 
            settings.enabledFor.includes(operationType)
        ) && txValue >= valueThreshold;
        
        if (requires2FA) {
            // Проверяем, была ли проведена 2FA недавно
            const now = Math.floor(Date.now() / 1000);
            const timeSinceLastVerification = now - settings.lastVerification;
            
            // Если прошло более 30 минут с последней проверки, требуется новая 2FA
            if (timeSinceLastVerification > 1800) {
                // Проверяем, есть ли события 2FA в этой транзакции
                const has2FAEvent = txEvent.filterLog(TWO_FACTOR_AUTH_EVENT).length > 0 ||
                                   txEvent.filterLog(TWO_FACTOR_AUTH_SUCCESS).length > 0;
                
                if (!has2FAEvent) {
                    findings.push(
                        Finding.fromObject({
                            name: 'Missing 2FA for High-Risk Transaction',
                            description: `Transaction requires 2FA but authentication was not performed`,
                            alertId: '2FA-MISSING-1',
                            severity: FindingSeverity.High,
                            type: FindingType.Suspicious,
                            metadata: {
                                user: txEvent.from,
                                value: txEvent.transaction.value,
                                operationType: operationType,
                                txHash: txEvent.hash
                            }
                        })
                    );
                }
            }
        }
    }
    
    /**
     * Проверяет выполнение высокорисковых операций
     */
    private async checkHighRiskOperations(txEvent: TransactionEvent, findings: Finding[]) {
        // Если не высокорисковая транзакция или не пользователь с 2FA, пропускаем
        const txValue = BigInt(txEvent.transaction.value);
        if (txValue < HIGH_RISK_VALUE_THRESHOLD && !this.isHighRiskOperation(txEvent)) {
            return;
        }
        
        const sender = txEvent.from.toLowerCase();
        
        // Проверяем, требуется ли добавление 2FA для пользователя
        if (!this.usersWith2FA.has(sender)) {
            findings.push(
                Finding.fromObject({
                    name: '2FA Recommended for User',
                    description: `User performed high-risk transaction without 2FA enabled`,
                    alertId: '2FA-RECOMMENDED-1',
                    severity: FindingSeverity.Medium,
                    type: FindingType.Info,
                    metadata: {
                        user: txEvent.from,
                        value: txEvent.transaction.value,
                        operationType: this.identifyOperationType(txEvent),
                        txHash: txEvent.hash
                    }
                })
            );
        }
    }
    
    /**
     * Определяет тип операции транзакции
     */
    private identifyOperationType(txEvent: TransactionEvent): string {
        if (!txEvent.to || !txEvent.transaction.data || txEvent.transaction.data === '0x') {
            return 'eth_transfer';
        }
        
        const functionSelector = txEvent.transaction.data.slice(0, 10);
        
        // Определяем тип операции по селектору функции
        for (const [type, selector] of Object.entries(HIGH_RISK_OPERATIONS)) {
            if (functionSelector === selector) {
                return type.toLowerCase();
            }
        }
        
        return 'unknown';
    }
    
    /**
     * Проверяет, является ли операция высокорисковой
     */
    private isHighRiskOperation(txEvent: TransactionEvent): boolean {
        if (!txEvent.to || !txEvent.transaction.data || txEvent.transaction.data === '0x') {
            return false;
        }
        
        const functionSelector = txEvent.transaction.data.slice(0, 10);
        
        return Object.values(HIGH_RISK_OPERATIONS).includes(functionSelector);
    }
    
    /**
     * Инициализирует настройки 2FA по умолчанию
     */
    private initializeDefaultSettings() {
        // Для демонстрации добавляем несколько тестовых адресов
        // В реальном сценарии эти настройки загружались бы из базы данных
        const testAddresses = [
            '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
            '0x123d35Cc6634C0532925a3b844Bc454e4438f123'
        ];
        
        for (const address of testAddresses) {
            this.usersWith2FA.add(address.toLowerCase());
            this.user2FASettings.set(address.toLowerCase(), {
                enabledFor: ['all'], // 2FA для всех операций
                valueThreshold: ethers.parseEther('0.1'), // Порог 0.1 ETH
                lastVerification: 0 // Еще не было проверок
            });
        }
    }
}
