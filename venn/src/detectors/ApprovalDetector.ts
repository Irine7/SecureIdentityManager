import { ethers } from 'ethers'
import {
    Finding,
    FindingSeverity,
    FindingType,
    getEthersProvider,
    type HandleTransaction,
    type TransactionEvent,
} from 'forta-agent'

// Сигнатуры событий и функций для аппрувов
const ERC20_APPROVAL_TOPIC = ethers.id('Approval(address,address,uint256)');
const ERC721_APPROVAL_TOPIC = ethers.id('Approval(address,address,uint256)');
const ERC721_APPROVAL_FOR_ALL_TOPIC = ethers.id('ApprovalForAll(address,address,bool)');
const ERC1155_APPROVAL_FOR_ALL_TOPIC = ethers.id('ApprovalForAll(address,address,bool)');

// Сигнатуры функций аппрува
const ERC20_APPROVE_FUNC = '0x095ea7b3'; // approve(address,uint256)
const ERC721_APPROVE_FUNC = '0x095ea7b3'; // approve(address,uint256)
const ERC721_APPROVE_FOR_ALL_FUNC = '0xa22cb465'; // setApprovalForAll(address,bool)
const ERC1155_APPROVE_FOR_ALL_FUNC = '0xa22cb465'; // setApprovalForAll(address,bool)

// Значение MAX_UINT для бесконечных разрешений
const UNLIMITED_ALLOWANCE = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';

// База данных известных токсичных контрактов
const KNOWN_MALICIOUS_CONTRACTS = [
    '0x7ea2f8c2a3c7c0850e59a8d155a7b8ed5a7cee65',
    '0xa9881c706647ce486b687d47e04a6f64c308a6c9'
];

// База данных известных безопасных контрактов (DEX, lending protocols, etc.)
const KNOWN_SAFE_CONTRACTS = {
    // DEX роутеры
    '0x7a250d5630b4cf539739df2c5dacb4c659f2488d': 'Uniswap V2 Router', 
    '0xe592427a0aece92de3edee1f18e0157c05861564': 'Uniswap V3 Router',
    '0xd9e1ce17f2641f24ae83637ab66a2cca9c378b9f': 'SushiSwap Router',
    // Lending протоколы
    '0x7d2768de32b0b80b7a3454c06bdac94a69ddc7a9': 'Aave V2 Lending Pool',
    '0x398ec7346dcd622edc5ae82352f02be94c62d119': 'Aave V2 Lending Pool Core',
    '0x3d9819210a31b4961b30ef54be2aed79b9c9cd3b': 'Compound Controller',
    // Другие известные протоколы
    '0x00000000006c3852cbef3e08e8df289169ede581': 'OpenSea Seaport'
};

/**
 * Детектор подозрительных разрешений (approvals)
 * Выявляет злонамеренные/рискованные/обманчивые разрешения,
 * которые могут предоставить злоумышленникам доступ к активам пользователя
 */
export class ApprovalDetector {
    /**
     * Анализирует транзакцию на предмет подозрительных разрешений
     */
    public async handleTransaction(txEvent: TransactionEvent) {
        const findings: Finding[] = [];
        
        // Проверка ERC20 разрешений
        await this.detectERC20Approvals(txEvent, findings);
        
        // Проверка ERC721/ERC1155 разрешений
        await this.detectNFTApprovals(txEvent, findings);
        
        // Проверка на множественные разрешения в одной транзакции
        await this.detectMultipleApprovals(txEvent, findings);
        
        // Проверка подозрительных моделей поведения разрешений
        await this.detectSuspiciousApprovalPatterns(txEvent, findings);
        
        return findings;
    }
    
    /**
     * Проверяет на подозрительные ERC20 разрешения
     */
    private async detectERC20Approvals(txEvent: TransactionEvent, findings: Finding[]) {
        // Получаем все логи Approval
        const approvalLogs = txEvent.filterLog(ERC20_APPROVAL_TOPIC);
        
        for (const log of approvalLogs) {
            try {
                const { owner, spender, value } = log.args;
                const spenderLower = spender.toLowerCase();
                const tokenAddress = log.address.toLowerCase();
                
                // Проверка на максимальное разрешение
                if (value.toString() === UNLIMITED_ALLOWANCE) {
                    // Проверка, является ли spender контрактом
                    const isContract = await this.isContract(spender);
                    const isNewContract = await this.isNewContract(spender);
                    
                    // Если spender известен как опасный контракт
                    if (KNOWN_MALICIOUS_CONTRACTS.includes(spenderLower)) {
                        findings.push(
                            Finding.fromObject({
                                name: 'Approval To Known Malicious Contract',
                                description: `Unlimited token approval to a known malicious contract`,
                                alertId: 'APPROVAL-MALICIOUS-1',
                                severity: FindingSeverity.Critical,
                                type: FindingType.Exploit,
                                metadata: {
                                    owner: owner,
                                    spender: spender,
                                    token: log.address,
                                    value: value.toString()
                                }
                            })
                        );
                    }
                    // Если это не контракт (EOA)
                    else if (!isContract) {
                        findings.push(
                            Finding.fromObject({
                                name: 'Unlimited Approval To EOA',
                                description: `Unlimited token approval to an externally owned account`,
                                alertId: 'APPROVAL-SUSPICIOUS-1',
                                severity: FindingSeverity.High,
                                type: FindingType.Suspicious,
                                metadata: {
                                    owner: owner,
                                    spender: spender,
                                    token: log.address,
                                    value: value.toString()
                                }
                            })
                        );
                    }
                    // Если это новый контракт
                    else if (isNewContract) {
                        findings.push(
                            Finding.fromObject({
                                name: 'Unlimited Approval To New Contract',
                                description: `Unlimited token approval to a recently deployed contract`,
                                alertId: 'APPROVAL-SUSPICIOUS-2',
                                severity: FindingSeverity.High,
                                type: FindingType.Suspicious,
                                metadata: {
                                    owner: owner,
                                    spender: spender,
                                    token: log.address,
                                    value: value.toString()
                                }
                            })
                        );
                    }
                    // Если это не известный безопасный контракт
                    else if (!this.isKnownSafeContract(spender)) {
                        findings.push(
                            Finding.fromObject({
                                name: 'Unlimited Approval To Unknown Contract',
                                description: `Unlimited token approval to an unknown contract`,
                                alertId: 'APPROVAL-CAUTION-1',
                                severity: FindingSeverity.Medium,
                                type: FindingType.Suspicious,
                                metadata: {
                                    owner: owner,
                                    spender: spender,
                                    token: log.address,
                                    value: value.toString()
                                }
                            })
                        );
                    }
                }
                // Проверка на аномально высокое, но не бесконечное разрешение
                else {
                    const valueNum = BigInt(value.toString());
                    // Если разрешение > 10^24 (более миллиона токенов, с 18 десятичными знаками)
                    if (valueNum > BigInt('1000000000000000000000000')) {
                        findings.push(
                            Finding.fromObject({
                                name: 'High Value Approval',
                                description: `Extremely high-value token approval granted`,
                                alertId: 'APPROVAL-CAUTION-2',
                                severity: FindingSeverity.Medium,
                                type: FindingType.Suspicious,
                                metadata: {
                                    owner: owner,
                                    spender: spender,
                                    token: log.address,
                                    value: value.toString()
                                }
                            })
                        );
                    }
                }
            } catch (error) {
                console.error('Error processing ERC20 approval:', error);
            }
        }
    }
    
    /**
     * Проверяет на подозрительные NFT разрешения (ERC721/ERC1155)
     */
    private async detectNFTApprovals(txEvent: TransactionEvent, findings: Finding[]) {
        // Проверка разрешений ApprovalForAll
        const approvalForAllERC721Logs = txEvent.filterLog(ERC721_APPROVAL_FOR_ALL_TOPIC);
        const approvalForAllERC1155Logs = txEvent.filterLog(ERC1155_APPROVAL_FOR_ALL_TOPIC);
        
        // Объединяем логи
        const approvalForAllLogs = [...approvalForAllERC721Logs, ...approvalForAllERC1155Logs];
        
        for (const log of approvalForAllLogs) {
            try {
                const { owner, operator, approved } = log.args;
                const operatorLower = operator.toLowerCase();
                
                // Проверяем только если разрешение предоставлено (approved === true)
                if (approved) {
                    // Проверка, является ли operator контрактом
                    const isContract = await this.isContract(operator);
                    const isNewContract = await this.isNewContract(operator);
                    
                    // Если operator известен как опасный контракт
                    if (KNOWN_MALICIOUS_CONTRACTS.includes(operatorLower)) {
                        findings.push(
                            Finding.fromObject({
                                name: 'NFT Approval To Known Malicious Contract',
                                description: `Full collection approval to a known malicious contract`,
                                alertId: 'NFT-APPROVAL-MALICIOUS-1',
                                severity: FindingSeverity.Critical,
                                type: FindingType.Exploit,
                                metadata: {
                                    owner: owner,
                                    operator: operator,
                                    collection: log.address
                                }
                            })
                        );
                    }
                    // Если это не контракт (EOA)
                    else if (!isContract) {
                        findings.push(
                            Finding.fromObject({
                                name: 'NFT Approval To EOA',
                                description: `Full NFT collection approval to an externally owned account`,
                                alertId: 'NFT-APPROVAL-SUSPICIOUS-1',
                                severity: FindingSeverity.High,
                                type: FindingType.Suspicious,
                                metadata: {
                                    owner: owner,
                                    operator: operator,
                                    collection: log.address
                                }
                            })
                        );
                    }
                    // Если это новый контракт
                    else if (isNewContract) {
                        findings.push(
                            Finding.fromObject({
                                name: 'NFT Approval To New Contract',
                                description: `Full NFT collection approval to a recently deployed contract`,
                                alertId: 'NFT-APPROVAL-SUSPICIOUS-2',
                                severity: FindingSeverity.High,
                                type: FindingType.Suspicious,
                                metadata: {
                                    owner: owner,
                                    operator: operator,
                                    collection: log.address
                                }
                            })
                        );
                    }
                    // Если это не известный безопасный контракт
                    else if (!this.isKnownSafeContract(operator)) {
                        findings.push(
                            Finding.fromObject({
                                name: 'NFT Approval To Unknown Contract',
                                description: `Full NFT collection approval to an unknown contract`,
                                alertId: 'NFT-APPROVAL-CAUTION-1',
                                severity: FindingSeverity.Medium,
                                type: FindingType.Suspicious,
                                metadata: {
                                    owner: owner,
                                    operator: operator,
                                    collection: log.address
                                }
                            })
                        );
                    }
                }
            } catch (error) {
                console.error('Error processing NFT approval:', error);
            }
        }
    }
    
    /**
     * Проверяет на множественные разрешения в одной транзакции
     */
    private async detectMultipleApprovals(txEvent: TransactionEvent, findings: Finding[]) {
        // Получаем все вызовы функций approve и setApprovalForAll
        const erc20ApproveCalls = txEvent.filterFunction(
            'function approve(address,uint256)'
        );
        
        const erc721ApproveForAllCalls = txEvent.filterFunction(
            'function setApprovalForAll(address,bool)'
        );
        
        // Считаем количество разрешений
        const totalApprovals = erc20ApproveCalls.length + erc721ApproveForAllCalls.length;
        
        // Проверяем на множественные разрешения (4+)
        if (totalApprovals >= 4) {
            findings.push(
                Finding.fromObject({
                    name: 'Multiple Approvals in Single Transaction',
                    description: `${totalApprovals} approvals granted in a single transaction`,
                    alertId: 'APPROVAL-PATTERN-1',
                    severity: FindingSeverity.High,
                    type: FindingType.Suspicious,
                    metadata: {
                        erc20ApprovalCount: erc20ApproveCalls.length.toString(),
                        nftApprovalCount: erc721ApproveForAllCalls.length.toString(),
                        transactionHash: txEvent.hash
                    }
                })
            );
        }
    }
    
    /**
     * Проверяет на подозрительные паттерны разрешений
     */
    private async detectSuspiciousApprovalPatterns(txEvent: TransactionEvent, findings: Finding[]) {
        try {
            // Проверяем, содержит ли транзакция и аппрувы, и переводы в одной транзакции
            const erc20ApproveCalls = txEvent.filterFunction(
                'function approve(address,uint256)'
            );
            
            const erc20TransferCalls = txEvent.filterFunction(
                'function transfer(address,uint256)'
            );
            
            const erc20TransferFromCalls = txEvent.filterFunction(
                'function transferFrom(address,address,uint256)'
            );
            
            // Если в одной транзакции есть и разрешение, и немедленный перевод
            if (erc20ApproveCalls.length > 0 && (erc20TransferCalls.length > 0 || erc20TransferFromCalls.length > 0)) {
                findings.push(
                    Finding.fromObject({
                        name: 'Approval And Transfer in Same Transaction',
                        description: `Transaction contains both approvals and transfers`,
                        alertId: 'APPROVAL-PATTERN-2',
                        severity: FindingSeverity.Medium,
                        type: FindingType.Suspicious,
                        metadata: {
                            approvalCount: erc20ApproveCalls.length.toString(),
                            transferCount: (erc20TransferCalls.length + erc20TransferFromCalls.length).toString(),
                            transactionHash: txEvent.hash
                        }
                    })
                );
            }
            
            // Проверяем на подозрительные вызовы после разрешения
            const contractCalls = txEvent.traces
                .filter(trace => trace.type === 'call' && trace.action && trace.action.input.length >= 10)
                .map(trace => ({
                    to: trace.action.to,
                    input: trace.action.input
                }));
            
            // Если после разрешения следует вызов неизвестной функции
            // Упрощенная проверка - в реальности требуется анализ последовательности вызовов
            if (erc20ApproveCalls.length > 0 && contractCalls.length > 3) {
                findings.push(
                    Finding.fromObject({
                        name: 'Complex Transaction with Approvals',
                        description: `Transaction with approvals contains many contract calls`,
                        alertId: 'APPROVAL-PATTERN-3',
                        severity: FindingSeverity.Medium,
                        type: FindingType.Suspicious,
                        metadata: {
                            approvalCount: erc20ApproveCalls.length.toString(),
                            callCount: contractCalls.length.toString(),
                            transactionHash: txEvent.hash
                        }
                    })
                );
            }
        } catch (error) {
            console.error('Error detecting suspicious approval patterns:', error);
        }
    }
    
    /**
     * Проверяет, является ли адрес контрактом
     */
    private async isContract(address: string): Promise<boolean> {
        try {
            const code = await getEthersProvider().getCode(address);
            return code !== '0x';
        } catch (error) {
            console.error(`Error checking if ${address} is a contract:`, error);
            return false;
        }
    }
    
    /**
     * Проверяет, является ли контракт недавно развернутым
     */
    private async isNewContract(address: string): Promise<boolean> {
        try {
            // Проверяем, является ли адрес контрактом
            const code = await getEthersProvider().getCode(address);
            if (code === '0x') return false;
            
            // Проверяем историю транзакций
            const txCount = await getEthersProvider().getTransactionCount(address);
            return txCount < 5; // Считаем контракт новым, если у него мало транзакций
        } catch (error) {
            console.error(`Error checking if ${address} is a new contract:`, error);
            return false;
        }
    }
    
    /**
     * Проверяет, является ли контракт известным безопасным
     */
    private isKnownSafeContract(address: string): boolean {
        return Object.keys(KNOWN_SAFE_CONTRACTS).includes(address.toLowerCase());
    }
}
