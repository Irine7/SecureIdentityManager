import { Router } from 'express'

import * as AppController from './controller'

const appRouter = Router()

appRouter.get('/version', AppController.versionController.getAppVersion)
appRouter.get('/health-check', AppController.healthCheckController.healthCheck)
appRouter.get('/', AppController.homeController.home)
appRouter.get('/api-docs', AppController.apiDocsController.apiDocs)

export { appRouter }
