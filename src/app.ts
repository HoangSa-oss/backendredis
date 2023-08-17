import express,{Express} from 'express'
import { ServerHoangsa } from './setupServer'
import databaseConnect from './setupDatabase'
import { config } from './config'
class Application{
  public intialize():void{
    this.loadConfig()
    databaseConnect()
    const app:Express = express()
    const server:ServerHoangsa = new ServerHoangsa(app)
    server.start()
  }
  private loadConfig():void{
    config.validateConfig()
  }
}
const application:Application = new Application()
application.intialize()