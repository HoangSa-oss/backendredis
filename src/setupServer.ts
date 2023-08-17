import { Application, json, urlencoded, Response, Request, NextFunction } from 'express';

import http from 'http'
import cors from 'cors';
import helmet from 'helmet';
import hpp from 'hpp';
import compression from 'compression';
import cookieSession from 'cookie-session';
import HTTP_STATUS from 'http-status-codes';
import { config } from './config';
import {Server} from 'socket.io'
import {createClient} from 'redis'
import Logger from 'bunyan';
import {createAdapter} from '@socket.io/redis-adapter'
import  applicationRouter from './routes'
import 'express-async-errors';
import { CustomError, IErrorResponse } from './shared/globals/helpers/error-handler';
const SERVER_PORT = 5000
const log:Logger = config.createLogger('sever')
export class ServerHoangsa {
  private app:Application;
  constructor(app:Application){
    this.app = app
  }
  public start():void{
    this.securityMiddleware(this.app)
    this.standardMiddleware(this.app)
    this.routerMiddleware(this.app)
    this.globalErrorMiddleware(this.app)
    this.startServer(this.app)
  }
  private securityMiddleware(app:Application):void{
    app.set('trust proxy', 1);
    app.use(
      cookieSession({
        name: 'session',
        keys: [config.SECRET_KEY_ONE!,config.SECRET_KEY_TWO!],
        maxAge: 24 * 7 * 3600000,
        secure: config.NODE_ENV !=='development'
      })
    );
    app.use(hpp());
    app.use(helmet());
    app.use(
      cors({
        origin: "*",
        credentials: true,
        optionsSuccessStatus: 200,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
      })
    );
  }
  private standardMiddleware(app:Application):void{
    app.use(compression());
    app.use(json({ limit: '50mb' }));
    app.use(urlencoded({ extended: true, limit: '50mb' }));
  }
  private routerMiddleware(app:Application):void{
    applicationRouter(app)
  }
  private globalErrorMiddleware(app:Application):void{}
  private async startServer(app:Application): Promise<void>{
    try {
      const httpServer:http.Server = new http.Server(app)
      const socketIo:Server = await this.createSocketIO(httpServer)
      this.startHttpServer(httpServer)
      this.socketIOConnections(socketIo)
    } catch (err) {
      log.error(err)
    }
  }
  private globalErrorHandler(app: Application): void {
    app.all('*', (req: Request, res: Response) => {
      res.status(HTTP_STATUS.NOT_FOUND).json({ message: `${req.originalUrl} not found` });
    });

    app.use((error: IErrorResponse, _req: Request, res: Response, next: NextFunction) => {
      log.error(error)
      if (error instanceof CustomError) {
        return res.status(error.statusCode).json(error.serializeErrors());
      }
      next();
    });
  }
  private async createSocketIO(httpServer:http.Server):Promise<Server>{
    const io:Server = new Server(httpServer,{
      cors: {
        origin: config.CLIENT_URL,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
      }
    })
    const pubClient = createClient({url:config.REDIS_HOST})
    const subClient = pubClient.duplicate()
    await Promise.all([pubClient.connect(),subClient.connect()])
    io.adapter(createAdapter(pubClient,subClient))
    return  io
  }
  private startHttpServer(httpServer:http.Server):void{
    log.info(`${process.pid}`)
    httpServer.listen(SERVER_PORT,()=>{
      log.info(`localhost:${SERVER_PORT}`)
    })
  } 
  private socketIOConnections(io: Server): void {
    
  }
}