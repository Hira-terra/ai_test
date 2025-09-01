import 'module-alias/register';
import express from 'express';
declare class Application {
    private app;
    constructor();
    private initializeMiddlewares;
    private initializeRoutes;
    private initializeErrorHandling;
    private healthCheck;
    private gracefulShutdown;
    private server?;
    start(): Promise<void>;
    getApp(): express.Application;
}
declare const application: Application;
declare const _default: express.Application;
export default _default;
export { application };
//# sourceMappingURL=index.d.ts.map