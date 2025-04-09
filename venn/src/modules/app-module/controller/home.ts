import { Request, Response } from 'express'

export const home = (req: Request, res: Response) => {
    const baseUrl = `${req.protocol}://${req.get('host')}`
    
    // Описание всех доступных маршрутов в системе
    const routes = [
        {
            path: `${baseUrl}/`,
            method: 'GET',
            description: 'Главная страница с описанием доступных маршрутов',
            example: {
                request: {
                    method: 'GET',
                    url: baseUrl
                },
                response: {
                    // Response is this current structure
                }
            }
        },
        {
            path: `${baseUrl}/app/version`,
            method: 'GET',
            description: 'Получение информации о версии приложения',
            example: {
                request: {
                    method: 'GET',
                    url: `${baseUrl}/app/version`
                },
                response: {
                    name: 'suspicious-approvals-detector',
                    version: '1.0.0'
                }
            }
        },
        {
            path: `${baseUrl}/app/health-check`,
            method: 'GET',
            description: 'Проверка работоспособности сервиса',
            example: {
                request: {
                    method: 'GET',
                    url: `${baseUrl}/app/health-check`
                },
                response: {
                    message: 'OK'
                }
            }
        },
        {
            path: `${baseUrl}/detect`,
            method: 'POST',
            description: 'Обнаружение подозрительных операций',
            example: {
                request: {
                    method: 'POST',
                    url: `${baseUrl}/detect`,
                    body: {
                        chainId: 1,
                        hash: '0xabcdef1234567890...',
                        trace: {
                            from: '0x1234567890abcdef...',
                            to: '0xfedcba0987654321...',
                            gas: '0x123456',
                            gasUsed: '0x123000',
                            input: '0x...',
                            pre: {},
                            post: {},
                        }
                    }
                },
                response: {
                    requestId: 'req-123',
                    chainId: 1,
                    detected: false,
                    protocolAddress: '0xfedcba0987654321...',
                    protocolName: 'Example'
                }
            }
        },
        {
            path: `${baseUrl}/detect/rugpull`,
            method: 'POST',
            description: 'Обнаружение потенциальных rug pull операций в смарт-контрактах',
            example: {
                request: {
                    method: 'POST',
                    url: `${baseUrl}/detect/rugpull`,
                    body: {
                        chainId: 1,
                        hash: '0xabcdef1234567890...',
                        trace: {
                            from: '0x1234567890abcdef...',
                            to: '0xfedcba0987654321...',
                            gas: '0x123456',
                            gasUsed: '0x123000',
                            input: '0x...',
                            pre: {},
                            post: {},
                            calls: [
                                {
                                    from: '0x1234567890abcdef...',
                                    to: '0x9876543210abcdef...',
                                    input: '0xf2fde38b...',
                                    gasUsed: '0x5000'
                                }
                            ]
                        }
                    }
                },
                response: {
                    requestId: 'req-456',
                    chainId: 1,
                    detected: true,
                    findings: [
                        {
                            name: 'Потенциальный Rugpull Смарт-Контракт',
                            description: 'Обнаружен контракт с признаками возможного rugpull',
                            alertId: 'RUGPULL-SC-1',
                            protocol: 'ethereum',
                            type: 'SUSPICIOUS',
                            severity: 'HIGH',
                            metadata: {
                                contractAddress: '0x9876543210abcdef...',
                                reasons: 'Обнаружена подозрительная функция: TRANSFER_OWNERSHIP',
                                txHash: '0xabcdef1234567890...'
                            }
                        }
                    ]
                }
            }
        }
    ]

    res.json({
        serviceName: 'Suspicious Approvals Detector',
        description: 'Сервис для обнаружения подозрительных операций одобрения и потенциальных rug pull',
        routes
    })
}
