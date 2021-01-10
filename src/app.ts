import express from 'express'
import ipc from 'node-ipc'
import {Log, LogData} from './Log'

const app: express.Application = express()
const port: number = Number(process.env.PORT) || 3001

export enum ACTION {
  START_LOGGING = 'log:start',
  SET_INDEX_NAME = 'log:set_index_name',
  ADD_LOGS = 'log:add'
}

interface ServerPayload {
  action: ACTION
  payload: LogData
}

const WHETSTONE_SERVER = 'whetstone'
const WHETSTONE_LOGGING_CLIENT = 'whetstone_logs'
ipc.config.id = WHETSTONE_LOGGING_CLIENT
ipc.config.retry = 1500

ipc.connectTo(WHETSTONE_SERVER, function() {
  ipc.of[WHETSTONE_SERVER].on('connect', function() {
    ipc.of[WHETSTONE_SERVER].emit('message', 'hello')
  })
  ipc.of[WHETSTONE_SERVER].on('message', function(data: ServerPayload) {
    switch (data.action) {
      case ACTION.START_LOGGING:
        Log.start()
        break
      case ACTION.SET_INDEX_NAME:
        Log.setIndexName(data.payload.customIndexName)
        break
      case ACTION.ADD_LOGS:
        Log.add(data.payload)
        break
      default:
    }
  })
})

app.listen(port, () => {
  console.log('NODE_ENV =', process.env.NODE_ENV)
})
