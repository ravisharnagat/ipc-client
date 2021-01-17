/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable no-console */
import AWS from 'aws-sdk'

export enum EVENT {
  REQUEST = 'request',
  OPEN = 'open',
  MESSAGE = 'message',
  ERROR = 'error',
  CLOSE = 'close',
  SUBSCRIBE = 'subscribe',
  UNSUBSCRIBE = 'unsubscribe'
}

export interface LogData {
  connectionId: string
  timestamp: Date
  customIndexName: string
  indexName: string
  payload: Record<string, unknown>
  event: EVENT
}

const ES_ENDPOINT =
  'vpc-whetstone-alt-ia4pnjln3qqws4hy5pojyvc2hq.us-east-1.es.amazonaws.com'
const REGION = 'us-east-1'

const logStore: unknown[] = []

export const jitter = (min: number, max: number): number => {
  const rand = Math.random()
  return Math.ceil(min + (max - min) * rand)
}

export class Log {
  static indexName = ''

  static add = (logData: LogData): void => {
    logStore.push(
      {index: {_index: logData.customIndexName || Log.indexName}},
      {
        '@timestamp': new Date(logData.timestamp).toISOString(),
        ...logData
      }
    )
  }

  static start(): void {
    setInterval(() => {
      sendData2AWSManagedES(logStore)
      logStore.length = 0
    }, jitter(5000, 30000))
  }

  static setIndexName(indexName: string): void {
    Log.indexName = indexName
  }
}

interface ESResponse {
  statusCode: number
  statusMessage: string
  on: (eventName: string, cb: (data: string) => void) => void
}

/**
 * AWS ES adaptor for bulk logs request payload
 * @param data log data
 */
const stringify = <T>(data: T[]): string => {
  let str = ''
  data.forEach(element => {
    str += JSON.stringify(element) + '\n'
  })
  return str
}

/**
 * Sends the logs to AWS and clears the log store on success response
 *
 * @param data array of logs with indexes (MUTABLE)
 */
const sendData2AWSManagedES = <T>(data: Array<T>): void => {
  if (data.length === 0) {
    return
  }
  const endpoint = new AWS.Endpoint(ES_ENDPOINT)
  const request = new AWS.HttpRequest(endpoint, REGION)
  request.path += '_bulk?filter_path=errors'
  request.body = stringify(data)
  request.headers['host'] = ES_ENDPOINT
  request.headers['Content-Type'] = 'application/json'
  request.headers['Content-Length'] = `${request.body.length}`
  // @ts-ignore
  const client = new AWS.HttpClient()
  client.handleRequest(
    request,
    null,
    (response: ESResponse): void => {
      let responseBody = ''
      response.on('data', (chunk: string) => {
        responseBody += chunk
      })
      response.on('end', () => {
        console.log(
          'Logs sent:',
          data.length,
          '/ Response body: ' + responseBody
        )
      })
    },
    (error: Error): void => {
      console.log('Logs lost:', data.length, '/ Error: ' + error)
    }
  )
}
