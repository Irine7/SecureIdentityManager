import { TransactionEvent, EventType, Network, Trace, Log, Transaction, TxEventBlock } from 'forta-agent';
import { DetectionRequestTrace } from '../modules/detection-module/dtos/requests/detect-request';

/**
 * Создает объект TransactionEvent из данных трассировки транзакции
 * @param trace Данные трассировки транзакции из запроса
 * @returns Объект TransactionEvent для обработки детекторами
 */
export function CreateTransactionEvent(trace: DetectionRequestTrace): TransactionEvent {
    // Формируем базовую информацию о блоке и транзакции
    const transaction: Transaction = {
        hash: trace.transactionHash || '0x0',
        from: trace.from,
        to: trace.to || null,
        gas: trace.gas || '0x0', 
        gasPrice: '0x0',
        value: trace.value || '0x0',
        nonce: 0,
        // Удаляем поле input и используем data вместо него
        data: trace.input || '0x',
        r: '0x',
        s: '0x',
        v: '0x0' // v должен быть строкой, а не числом
    };

    // Создаем блок, совместимый с требуемым типом для TransactionEvent
    const txEventBlock = {
        number: trace.blockNumber || 0,
        hash: '0x0',
        timestamp: Math.floor(Date.now() / 1000),
    };

    // Преобразуем логи трассировки в формат, ожидаемый Forta
    const logs: Log[] = (trace.logs || []).map(log => ({
        address: log.address,
        topics: log.topics,
        data: log.data,
        logIndex: 0,
        blockNumber: txEventBlock.number,
        blockHash: txEventBlock.hash,
        transactionHash: transaction.hash,
        transactionIndex: 0,
        removed: false,
    }));

    // Преобразуем трассировки в формат, ожидаемый Forta
    const traces: Trace[] = (trace.calls || []).map(call => ({
        action: {
            callType: 'call',
            to: call.to || '',
            input: call.input || '',
            from: call.from || '',
            value: call.value || '0x0',
            init: '',
            address: '',
            balance: '0',
            refundAddress: ''
        },
        blockHash: txEventBlock.hash,
        blockNumber: txEventBlock.number,
        result: {
            gasUsed: call.gasUsed || '0',
            address: call.to || '',
            code: '0x',
            output: call.output || '0x'
        },
        subtraces: 0,
        traceAddress: [],
        transactionHash: transaction.hash,
        transactionPosition: 0,
        type: 'call',
        error: ''
    }));

    const addresses = {}; // Пустой объект адресов для соответствия сигнатуре
    const contractAddress = transaction.to || null;
    
    // Создаем и возвращаем объект TransactionEvent с правильным порядком аргументов
    return new TransactionEvent(
        EventType.BLOCK,
        Network.MAINNET,
        transaction,
        traces,
        addresses,
        txEventBlock, // Используем txEventBlock вместо block
        logs,
        contractAddress
    );
}
