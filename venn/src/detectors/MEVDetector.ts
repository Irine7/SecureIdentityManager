import { ethers } from 'ethers'
import {
    Finding,
    FindingSeverity,
    FindingType,
    getEthersProvider,
    type HandleTransaction,
    type TransactionEvent,
} from 'forta-agent'

// Сигнатуры функций популярных DEX для свопов
const SWAP_FUNCTIONS = {
    UNISWAP_V2_SWAP_EXACT_ETH_FOR_TOKENS: '0x7ff36ab5', // swapExactETHForTokens(uint256,address[],address,uint256)
    UNISWAP_V2_SWAP_EXACT_TOKENS_FOR_ETH: '0x18cbafe5', // swapExactTokensForETH(uint256,uint256,address[],address,uint256)
    UNISWAP_V2_SWAP_EXACT_TOKENS_FOR_TOKENS: '0x38ed1739', // swapExactTokensForTokens(uint256,uint256,address[],address,uint256)
    UNISWAP_V3_EXACT_INPUT: '0xc04b8d59', // exactInput((bytes,address,uint256,uint256,uint256))
    UNISWAP_V3_EXACT_OUTPUT: '0xf28c0498', // exactOutput((bytes,address,uint256,uint256,uint256))
    SUSHISWAP_SWAP_EXACT_ETH_FOR_TOKENS: '0x7ff36ab5', // swapExactETHForTokens(uint256,address[],address,uint256)
    PANCAKESWAP_SWAP_EXACT_ETH_FOR_TOKENS: '0x7ff36ab5', // swapExactETHForTokens(uint256,address[],address,uint256)
};

// Адреса основных роутеров
const DEX_ROUTERS = {
    UNISWAP_V2: '0x7a250d5630b4cf539739df2c5dacb4c659f2488d',
    UNISWAP_V3: '0xe592427a0aece92de3edee1f18e0157c05861564',
    SUSHISWAP: '0xd9e1ce17f2641f24ae83637ab66a2cca9c378b9f',
    PANCAKESWAP: '0x10ed43c718714eb63d5aa57b78b54704e256024e'
};

// Интерфейсы для парсинга данных DEX
const DEX_ROUTER_INTERFACES = {
    UNISWAP_V2: new ethers.Interface([
        'function swapExactETHForTokens(uint256 amountOutMin, address[] path, address to, uint256 deadline) payable returns (uint256[] amounts)',
        'function swapExactTokensForETH(uint256 amountIn, uint256 amountOutMin, address[] path, address to, uint256 deadline) returns (uint256[] amounts)',
        'function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] path, address to, uint256 deadline) returns (uint256[] amounts)'
    ]),
    UNISWAP_V3: new ethers.Interface([
        'function exactInput(tuple(bytes path, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum)) payable returns (uint256 amountOut)',
        'function exactOutput(tuple(bytes path, address recipient, uint256 deadline, uint256 amountOut, uint256 amountInMaximum)) payable returns (uint256 amountIn)'
    ])
};

/**
 * Детектор MEV (Максимальная извлекаемая ценность)
 * Обнаруживает атаки по извлечению ценности, такие как сэндвич-трейды,
 * которые эксплуатируют пользователей во время обменов и торгов
 */
export class MEVDetector {
    // Сохраняем наблюдаемые транзакции для выявления сэндвич-атак
    private pendingSwaps: Map<string, {
        blockNumber: number,
        timestamp: number,
        from: string,
        tokenPath: string[],
        amountIn: bigint,
        amountOutMin: bigint,
        slippage: number
    }> = new Map();
    
    /**
     * Анализирует транзакции на предмет MEV
     */
    public async handleTransaction(txEvent: TransactionEvent) {
        const findings: Finding[] = [];
        
        // Проверяем на подозрительно высокие значения газа (характерно для MEV)
        await this.checkForHighGasPrice(txEvent, findings);
        
        // Проверяем на характерные сэндвич-атаки
        await this.checkForSandwichAttacks(txEvent, findings);
        
        // Проверяем на подозрительные параметры свопа (низкий minAmountOut)
        await this.checkForLowSlippageTolerance(txEvent, findings);
        
        // Проверяем на подозрительные маршруты обмена
        await this.checkForUnusualSwapRoutes(txEvent, findings);
        
        return findings;
    }
    
    /**
     * Проверяет транзакцию на необычно высокую цену газа
     */
    private async checkForHighGasPrice(txEvent: TransactionEvent, findings: Finding[]) {
        // Проверяем, является ли цена газа необычно высокой
        if (txEvent.gasPrice) {
            const gasPrice = BigInt(txEvent.gasPrice);
            const provider = getEthersProvider();
            
            try {
                // Получаем средние значения газа за последние блоки
                const feeData = await provider.getFeeData();
                const averageGasPrice = feeData.gasPrice ? BigInt(feeData.gasPrice.toString()) : BigInt(0);
                
                // Если цена газа в 5+ раз выше средней, это может быть MEV
                if (averageGasPrice > 0 && gasPrice > averageGasPrice * BigInt(5)) {
                    findings.push(
                        Finding.fromObject({
                            name: 'High Gas Price Transaction',
                            description: `Transaction with unusually high gas price (${gasPrice.toString()})`,
                            alertId: 'MEV-1',
                            protocol: 'ethereum',
                            severity: FindingSeverity.Medium,
                            type: FindingType.Suspicious,
                            metadata: {
                                from: txEvent.from,
                                to: txEvent.to || '',
                                gasPrice: gasPrice.toString(),
                                averageGasPrice: averageGasPrice.toString(),
                                ratio: (Number(gasPrice) / Number(averageGasPrice)).toFixed(2)
                            }
                        })
                    );
                }
            } catch (error) {
                console.error('Error checking gas price:', error);
            }
        }
    }
    
    /**
     * Проверяет на сэндвич-атаки в DEX
     */
    private async checkForSandwichAttacks(txEvent: TransactionEvent, findings: Finding[]) {
        // Проверяем, является ли транзакция свопом
        if (!this.isSwapTransaction(txEvent)) return;
        
        // Анализируем данные свопа
        const swapData = await this.parseSwapData(txEvent);
        if (!swapData) return;
        
        // Сохраняем информацию о свопе для будущего анализа
        this.pendingSwaps.set(txEvent.hash, {
            blockNumber: Number(txEvent.blockNumber),
            timestamp: Math.floor(Date.now() / 1000),
            from: txEvent.from,
            tokenPath: swapData.path,
            amountIn: swapData.amountIn,
            amountOutMin: swapData.amountOutMin,
            slippage: swapData.slippage
        });
        
        // Очистка старых записей (старше 100 блоков)
        this.cleanupOldSwaps(Number(txEvent.blockNumber) - 100);
        
        // Проверяем на паттерны сэндвич-атак в текущем блоке
        const currentBlockSwaps = Array.from(this.pendingSwaps.entries())
            .filter(([_, data]) => data.blockNumber === Number(txEvent.blockNumber))
            .map(([hash, data]) => ({ hash, ...data }));
        
        if (currentBlockSwaps.length >= 3) {
            // Ищем потенциальные сэндвич-атаки (A -> B -> A)
            // В реальной реализации здесь был бы более сложный алгоритм,
            // учитывающий маршруты токенов и временные паттерны
            
            // Для примера: обнаруживаем последовательные свопы с одинаковыми токенами
            for (let i = 0; i < currentBlockSwaps.length - 2; i++) {
                const swap1 = currentBlockSwaps[i];
                const swap2 = currentBlockSwaps[i + 1];
                const swap3 = currentBlockSwaps[i + 2];
                
                // Проверяем, образуют ли свопы сэндвич-паттерн
                if (
                    this.areSimilarPaths(swap1.tokenPath, swap3.tokenPath) &&
                    swap1.from === swap3.from &&
                    swap1.from !== swap2.from
                ) {
                    findings.push(
                        Finding.fromObject({
                            name: 'Potential Sandwich Attack',
                            description: 'Pattern of transactions consistent with a sandwich attack detected',
                            alertId: 'MEV-2',
                            protocol: 'ethereum',
                            severity: FindingSeverity.High,
                            type: FindingType.Suspicious,
                            metadata: {
                                victimTx: swap2.hash,
                                frontrunTx: swap1.hash,
                                backrunTx: swap3.hash,
                                attacker: swap1.from,
                                victim: swap2.from,
                                tokenPath: JSON.stringify(swap2.tokenPath)
                            }
                        })
                    );
                }
            }
        }
    }
    
    /**
     * Проверяет на подозрительно низкий допуск проскальзывания
     */
    private async checkForLowSlippageTolerance(txEvent: TransactionEvent, findings: Finding[]) {
        // Проверяем, является ли транзакция свопом
        if (!this.isSwapTransaction(txEvent)) return;
        
        // Анализируем данные свопа
        const swapData = await this.parseSwapData(txEvent);
        if (!swapData) return;
        
        // Проверяем, слишком ли низкий допуск проскальзывания
        if (swapData.slippage < 0.001) { // менее 0.1%
            findings.push(
                Finding.fromObject({
                    name: 'Extremely Low Slippage Tolerance',
                    description: 'Swap with very low slippage tolerance, could be MEV target',
                    alertId: 'MEV-3',
                    protocol: 'ethereum',
                    severity: FindingSeverity.Medium,
                    type: FindingType.Suspicious,
                    metadata: {
                        from: txEvent.from,
                        to: txEvent.to || '',
                        amountIn: swapData.amountIn.toString(),
                        amountOutMin: swapData.amountOutMin.toString(),
                        slippage: swapData.slippage.toString(),
                        path: JSON.stringify(swapData.path)
                    }
                })
            );
        }
    }
    
    /**
     * Проверяет на необычные маршруты обмена
     */
    private async checkForUnusualSwapRoutes(txEvent: TransactionEvent, findings: Finding[]) {
        // Проверяем, является ли транзакция свопом
        if (!this.isSwapTransaction(txEvent)) return;
        
        // Анализируем данные свопа
        const swapData = await this.parseSwapData(txEvent);
        if (!swapData || !swapData.path) return;
        
        // Проверяем, слишком ли длинный маршрут обмена (может указывать на манипуляцию)
        if (swapData.path.length > 4) { // Обычно маршруты не длиннее 3-4 токенов
            findings.push(
                Finding.fromObject({
                    name: 'Unusual Swap Route',
                    description: `Swap with unusually long token path (${swapData.path.length} tokens)`,
                    alertId: 'MEV-4',
                    protocol: 'ethereum',
                    severity: FindingSeverity.Medium,
                    type: FindingType.Suspicious,
                    metadata: {
                        from: txEvent.from,
                        to: txEvent.to || '',
                        pathLength: swapData.path.length.toString(),
                        path: JSON.stringify(swapData.path)
                    }
                })
            );
        }
    }
    
    /**
     * Очищает старые записи о свопах
     */
    private cleanupOldSwaps(minBlockNumber: number) {
        for (const [hash, data] of this.pendingSwaps.entries()) {
            if (data.blockNumber < minBlockNumber) {
                this.pendingSwaps.delete(hash);
            }
        }
    }
    
    /**
     * Проверяет, является ли транзакция свопом на DEX
     */
    private isSwapTransaction(txEvent: TransactionEvent): boolean {
        if (!txEvent.to) return false;
        
        // Проверяем, является ли адрес получателя известным роутером DEX
        const isKnownRouter = Object.values(DEX_ROUTERS).some(
            router => txEvent.to && txEvent.to.toLowerCase() === router.toLowerCase()
        );
        
        if (!isKnownRouter) return false;
        
        // Проверяем, содержит ли данные транзакции сигнатуру функции свопа
        const hasSwapSignature = Object.values(SWAP_FUNCTIONS).some(
            signature => txEvent.transaction.data.startsWith(signature)
        );
        
        return hasSwapSignature;
    }
    
    /**
     * Извлекает данные о свопе из транзакции
     */
    private async parseSwapData(txEvent: TransactionEvent): Promise<{
        path: string[],
        amountIn: bigint,
        amountOutMin: bigint,
        slippage: number
    } | null> {
        if (!txEvent.to || !txEvent.transaction.data) return null;
        
        try {
            // Определяем, какой DEX используется
            const routerAddress = txEvent.to.toLowerCase();
            let path: string[] = [];
            let amountIn: bigint = BigInt(0);
            let amountOutMin: bigint = BigInt(0);
            
            // Парсим данные в зависимости от DEX
            if (routerAddress === DEX_ROUTERS.UNISWAP_V2.toLowerCase() || 
                routerAddress === DEX_ROUTERS.SUSHISWAP.toLowerCase() ||
                routerAddress === DEX_ROUTERS.PANCAKESWAP.toLowerCase()) {
                
                // Парсим данные Uniswap V2/Sushiswap/Pancakeswap
                const functionFragment = txEvent.transaction.data.slice(0, 10);
                
                if (functionFragment === SWAP_FUNCTIONS.UNISWAP_V2_SWAP_EXACT_ETH_FOR_TOKENS) {
                    const decoded = DEX_ROUTER_INTERFACES.UNISWAP_V2.parseTransaction({
                        data: txEvent.transaction.data,
                        value: txEvent.transaction.value
                    });
                    
                    amountIn = BigInt(txEvent.transaction.value);
                    if (decoded && decoded.args && decoded.args.length > 0) {
                        amountOutMin = BigInt(decoded.args[0].toString());
                        if (decoded.args.length > 1) {
                            path = decoded.args[1];
                        }
                    }
                    
                } else if (functionFragment === SWAP_FUNCTIONS.UNISWAP_V2_SWAP_EXACT_TOKENS_FOR_ETH ||
                           functionFragment === SWAP_FUNCTIONS.UNISWAP_V2_SWAP_EXACT_TOKENS_FOR_TOKENS) {
                    
                    const decoded = DEX_ROUTER_INTERFACES.UNISWAP_V2.parseTransaction({
                        data: txEvent.transaction.data,
                        value: '0'
                    });
                    
                    if (decoded && decoded.args && decoded.args.length > 2) {
                        amountIn = BigInt(decoded.args[0].toString());
                        amountOutMin = BigInt(decoded.args[1].toString());
                        path = decoded.args[2];
                    }
                }
                
            } else if (routerAddress === DEX_ROUTERS.UNISWAP_V3.toLowerCase()) {
                // Парсим данные Uniswap V3
                const functionFragment = txEvent.transaction.data.slice(0, 10);
                
                if (functionFragment === SWAP_FUNCTIONS.UNISWAP_V3_EXACT_INPUT) {
                    const decoded = DEX_ROUTER_INTERFACES.UNISWAP_V3.parseTransaction({
                        data: txEvent.transaction.data,
                        value: txEvent.transaction.value
                    });
                    
                    if (decoded && decoded.args && decoded.args.length > 0) {
                        const params = decoded.args[0];
                        amountIn = BigInt(params.amountIn.toString());
                        amountOutMin = BigInt(params.amountOutMinimum.toString());
                        
                        // Для V3 путь токенов закодирован в байты
                        // Это упрощенная реализация, в реальности требуется более сложный парсинг
                        path = ['token0', 'token1']; // placeholder
                    }
                    
                } else if (functionFragment === SWAP_FUNCTIONS.UNISWAP_V3_EXACT_OUTPUT) {
                    const decoded = DEX_ROUTER_INTERFACES.UNISWAP_V3.parseTransaction({
                        data: txEvent.transaction.data,
                        value: txEvent.transaction.value
                    });
                    
                    if (decoded && decoded.args && decoded.args.length > 0) {
                        const params = decoded.args[0];
                        amountIn = BigInt(params.amountInMaximum.toString());
                        amountOutMin = BigInt(params.amountOut.toString());
                        
                        // Упрощенно для примера
                        path = ['token0', 'token1']; // placeholder
                    }
                }
            }
            
            // Если не смогли распарсить, возвращаем null
            if (amountIn === BigInt(0) || path.length === 0) return null;
            
            // Вычисляем допуск проскальзывания
            // В реальности требуется учитывать реальные курсы токенов
            // Это упрощенная реализация
            const slippage = amountOutMin > 0 ? 
                1 - (Number(amountOutMin) / Number(amountIn)) : 0;
            
            return {
                path,
                amountIn,
                amountOutMin,
                slippage
            };
            
        } catch (error) {
            console.error('Error parsing swap data:', error);
            return null;
        }
    }
    
    /**
     * Проверяет, схожи ли два маршрута токенов
     */
    private areSimilarPaths(path1: string[], path2: string[]): boolean {
        if (path1.length !== path2.length) return false;
        
        return path1[0] === path2[0] && path1[path1.length - 1] === path2[path2.length - 1];
    }
}
