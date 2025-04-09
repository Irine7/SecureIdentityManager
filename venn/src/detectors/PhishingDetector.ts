import { ethers } from 'ethers'
import {
    Finding,
    FindingSeverity,
    FindingType,
    getEthersProvider,
    type HandleTransaction,
    type TransactionEvent,
} from 'forta-agent'

// Распространённые сигнатуры функций, которые часто используются в фишинг-атаках
const SUSPICIOUS_SIGNATURES = {
    TRANSFER: '0xa9059cbb', // transfer(address,uint256)
    TRANSFER_FROM: '0x23b872dd', // transferFrom(address,address,uint256)
    APPROVE_ALL: '0xa22cb465', // setApprovalForAll(address,bool)
    APPROVE: '0x095ea7b3', // approve(address,uint256)
    SET_OPERATOR: '0xf309926f', // setOperator(address,bool)
    MULTICALL: '0xac9650d8', // multicall(bytes[])
    BATCH_TRANSFER: '0x2eb2c2d6', // safeBatchTransferFrom(address,address,uint256[],uint256[],bytes)
    DELEGATE: '0x5c19a95c', // delegate(address)
};

// База данных известных фишинговых доменов и адресов
const KNOWN_PHISHING_DOMAINS = [
    'opensae.io',
    'uniswaps.org',
    'panckakeswap.finance',
    'aaveprotocol.org',
    'sushiswap.cm'
];

// Список известных контрактов-приманок (honeytraps)
const KNOWN_HONEYPOT_CONTRACTS = [
    '0x7ea2f8c2a3c7c0850e59a8d155a7b8ed5a7cee65',
    '0xa9881c706647ce486b687d47e04a6f64c308a6c9'
];

// Характерные признаки фишинговых транзакций
const PHISHING_PATTERNS = {
    // Подозрительно высокие разрешения на перевод
    EXCESSIVE_APPROVAL: ethers.MaxUint256.toString(),
    // Необычные значения газа
    STRANGE_GAS_PRICE: ethers.parseUnits('0.001', 'gwei').toString(),
    // Транзакции с очень длинными данными
    LONG_DATA_THRESHOLD: 5000
};

/**
 * Детектор фишинговых транзакций
 * Обнаруживает транзакции, инициированные со злонамеренных или поддельных интерфейсов dApp,
 * которые направлены на обман пользователей для подписания вредоносных действий
 */
export class PhishingDetector {
    
    /**
     * Анализирует транзакцию на предмет признаков фишинга
     */
    public async handleTransaction(txEvent: TransactionEvent) {
        const findings: Finding[] = [];
        
        // Проверка на взаимодействие с известными фишинговыми контрактами
        await this.checkKnownPhishingAddresses(txEvent, findings);
        
        // Проверка на подозрительные шаблоны разрешений и переводов
        await this.checkSuspiciousTokenOperations(txEvent, findings);
        
        // Проверка на фронтраннинг (опережающие транзакции, характерные для фишинга)
        await this.checkForFrontrunning(txEvent, findings);
        
        // Проверка на подозрительное делегирование прав
        await this.checkSuspiciousDelegation(txEvent, findings);
        
        // Проверка на взаимодействие с недавно созданными подозрительными контрактами
        await this.checkInteractionWithRecentContracts(txEvent, findings);
        
        return findings;
    }
    
    /**
     * Проверяет транзакцию на взаимодействие с известными фишинговыми адресами
     */
    private async checkKnownPhishingAddresses(txEvent: TransactionEvent, findings: Finding[]) {
        // Проверка адреса получателя на соответствие известным фишинговым адресам
        const suspiciousDestinations = KNOWN_HONEYPOT_CONTRACTS
            .filter(addr => txEvent.to && txEvent.to.toLowerCase() === addr.toLowerCase());
        
        if (suspiciousDestinations.length > 0) {
            findings.push(
                Finding.fromObject({
                    name: 'Known Phishing Address',
                    description: 'Transaction interacts with a known phishing address',
                    alertId: 'PHISHING-1',
                    protocol: 'ethereum',
                    severity: FindingSeverity.High,
                    type: FindingType.Suspicious,
                    metadata: {
                        address: txEvent.to || '',
                        from: txEvent.from
                    }
                })
            );
        }
    }
    
    /**
     * Проверяет транзакцию на подозрительные операции с токенами
     */
    private async checkSuspiciousTokenOperations(txEvent: TransactionEvent, findings: Finding[]) {
        // Проверяем вызовы функций approve и setApprovalForAll
        const approvalCalls = txEvent.filterFunction(
            ['function approve(address,uint256)', 'function setApprovalForAll(address,bool)']
        );
            
        for (const call of approvalCalls) {
            // Проверяем подозрительно большие разрешения
            if (call.name === 'approve' && call.args[1].toString() === PHISHING_PATTERNS.EXCESSIVE_APPROVAL) {
                // Проверяем, является ли получатель разрешения подозрительным
                const spender = call.args[0].toLowerCase();
                const isRecentContract = await this.isRecentlyDeployedContract(spender);
                
                if (isRecentContract) {
                    findings.push(
                        Finding.fromObject({
                            name: 'Suspicious Token Approval',
                            description: 'Unlimited token approval to a recently deployed contract',
                            alertId: 'PHISHING-2',
                            protocol: 'ethereum',
                            severity: FindingSeverity.High,
                            type: FindingType.Suspicious,
                            metadata: {
                                token: call.address,
                                spender: spender,
                                owner: txEvent.from,
                                value: call.args[1].toString()
                            }
                        })
                    );
                }
            }
            
            // Проверяем разрешения на все токены
            if (call.name === 'setApprovalForAll' && call.args[1] === true) {
                // Проверяем, является ли получатель разрешения подозрительным
                const operator = call.args[0].toLowerCase();
                const isRecentContract = await this.isRecentlyDeployedContract(operator);
                
                if (isRecentContract) {
                    findings.push(
                        Finding.fromObject({
                            name: 'Suspicious Collection Approval',
                            description: 'Approval granted for all NFTs to a recently deployed contract',
                            alertId: 'PHISHING-3',
                            protocol: 'ethereum',
                            severity: FindingSeverity.High,
                            type: FindingType.Suspicious,
                            metadata: {
                                collection: call.address,
                                operator: operator,
                                owner: txEvent.from
                            }
                        })
                    );
                }
            }
        }
        
        // Проверяем вызовы функций multicall, которые часто используются в фишинге
        const multicallFunctions = txEvent.filterFunction('function multicall(bytes[])');
        
        if (multicallFunctions.length > 0 && txEvent.transaction.data.length > PHISHING_PATTERNS.LONG_DATA_THRESHOLD) {
            findings.push(
                Finding.fromObject({
                    name: 'Suspicious Multicall',
                    description: 'Large data multicall transaction detected',
                    alertId: 'PHISHING-4',
                    protocol: 'ethereum',
                    severity: FindingSeverity.Medium,
                    type: FindingType.Suspicious,
                    metadata: {
                        contract: txEvent.to || '',
                        from: txEvent.from,
                        dataLength: txEvent.transaction.data.length.toString()
                    }
                })
            );
        }
    }
    
    /**
     * Проверка на фронтраннинг (опережающие транзакции)
     */
    private async checkForFrontrunning(txEvent: TransactionEvent, findings: Finding[]) {
        // В более полной реализации здесь был бы анализ мемпула и 
        // связанных транзакций для выявления фронтраннинга
        
        // Проверка на необычно высокие значения газа (характерно для фронтраннинга)
        if (
            txEvent.gasPrice && 
            BigInt(txEvent.gasPrice) > BigInt(ethers.parseUnits('500', 'gwei').toString())
        ) {
            findings.push(
                Finding.fromObject({
                    name: 'Potential Frontrunning',
                    description: 'Transaction with unusually high gas price',
                    alertId: 'PHISHING-5',
                    protocol: 'ethereum',
                    severity: FindingSeverity.Medium,
                    type: FindingType.Suspicious,
                    metadata: {
                        from: txEvent.from,
                        to: txEvent.to || '',
                        gasPrice: txEvent.gasPrice
                    }
                })
            );
        }
    }
    
    /**
     * Проверка на подозрительное делегирование прав
     */
    private async checkSuspiciousDelegation(txEvent: TransactionEvent, findings: Finding[]) {
        // Проверяем вызовы функции делегирования (часто используется в DeFi-проектах)
        const delegateCalls = txEvent.filterFunction('function delegate(address)');
        
        for (const call of delegateCalls) {
            const delegatee = call.args[0].toLowerCase();
            const isRecentAddress = await this.isRecentlyActiveAddress(delegatee);
            
            if (isRecentAddress) {
                findings.push(
                    Finding.fromObject({
                        name: 'Suspicious Delegation',
                        description: 'Voting power delegated to a recently active address',
                        alertId: 'PHISHING-6',
                        protocol: 'ethereum',
                        severity: FindingSeverity.Medium,
                        type: FindingType.Suspicious,
                        metadata: {
                            delegator: txEvent.from,
                            delegatee: delegatee,
                            contract: call.address
                        }
                    })
                );
            }
        }
    }
    
    /**
     * Проверка на взаимодействие с недавно созданными контрактами
     */
    private async checkInteractionWithRecentContracts(txEvent: TransactionEvent, findings: Finding[]) {
        if (!txEvent.to) return;
        
        const isRecentContract = await this.isRecentlyDeployedContract(txEvent.to);
        
        if (isRecentContract && txEvent.transaction.data.length > 0) {
            // Проверяем, содержит ли данные транзакции подозрительные сигнатуры
            const hasSuspiciousSignature = Object.values(SUSPICIOUS_SIGNATURES).some(
                signature => txEvent.transaction.data.startsWith(signature)
            );
            
            if (hasSuspiciousSignature) {
                findings.push(
                    Finding.fromObject({
                        name: 'Interaction with Suspicious New Contract',
                        description: 'Transaction to a recently deployed contract with suspicious function signature',
                        alertId: 'PHISHING-7',
                        protocol: 'ethereum',
                        severity: FindingSeverity.High,
                        type: FindingType.Suspicious,
                        metadata: {
                            from: txEvent.from,
                            to: txEvent.to,
                            data: txEvent.transaction.data.slice(0, 10) // Только сигнатура функции
                        }
                    })
                );
            }
        }
    }
    
    /**
     * Проверяет, является ли контракт недавно развернутым
     */
    private async isRecentlyDeployedContract(address: string): Promise<boolean> {
        try {
            const provider = getEthersProvider();
            
            // Проверяем, является ли адрес контрактом
            const code = await provider.getCode(address);
            if (code === '0x') return false;
            
            // Проверяем историю транзакций (упрощенная реализация)
            const txCount = await provider.getTransactionCount(address);
            return txCount < 5; // Считаем контракт новым, если у него мало транзакций
        } catch (error) {
            console.error(`Error checking if ${address} is a recently deployed contract:`, error);
            return false;
        }
    }
    
    /**
     * Проверяет, является ли адрес недавно активным
     */
    private async isRecentlyActiveAddress(address: string): Promise<boolean> {
        try {
            const provider = getEthersProvider();
            const txCount = await provider.getTransactionCount(address);
            return txCount < 3; // Считаем адрес новым, если у него мало исходящих транзакций
        } catch (error) {
            console.error(`Error checking if ${address} is a recently active address:`, error);
            return false;
        }
    }
}
