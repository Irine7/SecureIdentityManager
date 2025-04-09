import { ethers } from 'ethers'
import {
    Finding,
    FindingSeverity,
    FindingType,
    getEthersProvider,
    type HandleTransaction,
    type TransactionEvent,
} from 'forta-agent'

// Suspicious functions that may indicate a rugpull
const SUSPICIOUS_SIGNATURES = {
    // Function selectors that allow token withdrawal
    SELFDESTRUCT: '0x9cb8a26a', // selfdestruct(address)
    TRANSFER_OWNERSHIP: '0xf2fde38b', // transferOwnership(address)
    WITHDRAW_ALL: '0x853828b6', // withdrawAll()
    SET_FEE: '0x69fe0e2d', // setFee(uint256)
    PAUSE: '0x8456cb59', // pause()
    BLACKLIST: '0xf9f92be4', // blacklist(address)
    MINT: '0xa0712d68', // mint(uint256)
    STOP_TRADING: '0x75f12b21', // stopTrading()
}

// Suspicious events that may indicate a rugpull
const SUSPICIOUS_EVENTS = {
    OWNERSHIP_TRANSFERRED: ethers.id('OwnershipTransferred(address,address)'),
    PAUSED: ethers.id('Paused(address)'),
    BLACKLISTED: ethers.id('Blacklisted(address)'),
    WITHDRAW: ethers.id('Withdraw(address,uint256)'),
}

// Blacklisted contracts and addresses
const BLACKLISTED_ADDRESSES = new Set([
    '0x00000000000000000000000000000000000dead',
    '0x000000000000000000000000000000000000dead',
])

// Mock functions for demonstration (would be replaced with real implementations)
async function analyzeTokenomics(contractAddress: string): Promise<string[]> {
    // In a real implementation, analyze token distribution, liquidity, etc.
    return []
}

async function analyzeContractCode(contractAddress: string): Promise<string[]> {
    // In a real implementation, analyze contract code for suspicious patterns
    return []
}

async function analyzeContractHistory(contractAddress: string): Promise<string[]> {
    // In a real implementation, analyze past transactions of the contract
    return []
}

async function analyzeDeFiSpecificVulnerabilities(contractAddress: string): Promise<string[]> {
    // In a real implementation, analyze specific DeFi protocol vulnerabilities
    return []
}

// Main detector class
export class RugpullDetector {
    // Удаляем пустой конструктор, так как он не нужен
    
    // Метод должен быть асинхронным и возвращать Promise<Finding[]>
    public async handleTransaction(txEvent: TransactionEvent): Promise<Finding[]> {
        const findings: Finding[] = []

        // Check for suspicious function calls
        for (const [name, signature] of Object.entries(SUSPICIOUS_SIGNATURES)) {
            const functionCalls = txEvent.filterFunction(signature)

            for (const call of functionCalls) {
                findings.push(
                    Finding.fromObject({
                        name: 'Suspicious Function Call Detected',
                        description: `Suspicious function call detected: ${name}`,
                        alertId: 'RUGPULL-FUNC-1',
                        protocol: 'ethereum',
                        type: FindingType.Suspicious,
                        severity: FindingSeverity.Medium,
                        metadata: {
                            function: name,
                            signature,
                            from: txEvent.from,
                            to: txEvent.to || 'unknown',
                            txHash: txEvent.hash,
                        },
                    }),
                )
            }
        }

        // Check for suspicious events
        for (const [name, signature] of Object.entries(SUSPICIOUS_EVENTS)) {
            const events = txEvent.filterLog(signature)

            for (const event of events) {
                findings.push(
                    Finding.fromObject({
                        name: 'Suspicious Event Detected',
                        description: `Suspicious event detected: ${name}`,
                        alertId: 'RUGPULL-EVENT-1',
                        protocol: 'ethereum',
                        type: FindingType.Suspicious,
                        severity: FindingSeverity.Medium,
                        metadata: {
                            event: name,
                            address: event.address,
                            txHash: txEvent.hash,
                        },
                    }),
                )
            }
        }

        // Check for interactions with blacklisted addresses
        if (txEvent.to && BLACKLISTED_ADDRESSES.has(txEvent.to.toLowerCase())) {
            findings.push(
                Finding.fromObject({
                    name: 'Interaction with Blacklisted Address',
                    description: `Transaction interacting with blacklisted address: ${txEvent.to}`,
                    alertId: 'RUGPULL-ADDR-1',
                    protocol: 'ethereum',
                    type: FindingType.Suspicious,
                    severity: FindingSeverity.High,
                    metadata: {
                        address: txEvent.to,
                        from: txEvent.from,
                        txHash: txEvent.hash,
                    },
                }),
            )
        }

        // Check for large value transfers
        if (
            txEvent.transaction.value &&
            BigInt(txEvent.transaction.value) > ethers.parseEther('100')
        ) {
            findings.push(
                Finding.fromObject({
                    name: 'Large Value Transfer',
                    description: 'Large ETH value transfer detected',
                    alertId: 'RUGPULL-VALUE-1',
                    protocol: 'ethereum',
                    type: FindingType.Suspicious,
                    severity: FindingSeverity.Medium,
                    metadata: {
                        value: txEvent.transaction.value,
                        from: txEvent.from,
                        to: txEvent.to || 'unknown',
                        txHash: txEvent.hash,
                    },
                }),
            )
        }

        // Check for contract creations
        if (!txEvent.to) {
            const contractAddress = ethers.getCreateAddress({
                from: txEvent.from,
                nonce: BigInt(txEvent.transaction.nonce),
            })

            let allReasons: string[] = []

            // Analyze the tokenomics of the contract
            const tokenomicsReasons = await analyzeTokenomics(contractAddress)
            allReasons = [...allReasons, ...tokenomicsReasons]

            // Analyze the contract code for suspicious patterns
            const codeReasons = await analyzeContractCode(contractAddress)
            allReasons = [...allReasons, ...codeReasons]

            // Analyze the history of the contract
            const historyReasons = await analyzeContractHistory(contractAddress)
            allReasons = [...allReasons, ...historyReasons]

            // Analyze DeFi-specific vulnerabilities
            const defiReasons = await analyzeDeFiSpecificVulnerabilities(contractAddress)
            allReasons = [...allReasons, ...defiReasons]

            // If suspicious patterns are found, create an alert
            if (allReasons.length > 0) {
                findings.push(
                    Finding.fromObject({
                        name: 'Potential Rugpull Smart Contract',
                        description: `Potential rugpull contract detected: ${contractAddress}`,
                        alertId: 'RUGPULL-SC-1',
                        protocol: 'ethereum',
                        type: FindingType.Suspicious,
                        severity: FindingSeverity.High,
                        metadata: {
                            contractAddress,
                            reasons: allReasons.join(', '),
                            txHash: txEvent.hash,
                            blockNumber: txEvent.blockNumber.toString(),
                        },
                    }),
                )
            }
        }

        return findings
    }
}

// Создаем экземпляр детектора для использования в других модулях
export const rugpullDetector = new RugpullDetector()
