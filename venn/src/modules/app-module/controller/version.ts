import { Request, Response } from 'express'

// Информация о приложении вместо импорта из package.json
const appInfo = {
    name: 'suspicious-approvals-detector',
    version: '1.0.0'
}

export const getAppVersion = (req: Request, res: Response) => {
    res.json({ name: appInfo.name, version: appInfo.version })
}
