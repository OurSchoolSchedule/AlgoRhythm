// @vitest-environment jsdom
import { spawn, type ChildProcess } from 'node:child_process'
import { once } from 'node:events'
import { readFile } from 'node:fs/promises'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { resolve } from 'node:path'
import { stripVTControlCharacters } from 'node:util'
import { afterAll, beforeAll, expect, it } from 'vitest'
import client, { API_BASE_URL } from './client.js'
import { validateTeachingLoad } from './loadValidation'
import { clearTokens, setTokens } from './tokenStorage.js'

declare const jsdom: { reconfigure(options: { url: string }): void }
const path = '/api/v2/terms/547001/load-imports/validate?forGeneration=true'
const filename = 'teaching_load_42.xlsx'
const aliases = { 공수1: 20 }
const validatedLoadId = '375d0754-c375-42c6-b1f0-f630a9693e37'
let vite: ChildProcess
let upstream: Server
let bytes: Uint8Array<ArrayBuffer>
let receiverError: unknown
let refreshes = 0
let uploads = 0
let expired = 0
let probeHeader: string | string[] | undefined

beforeAll(async () => {
  bytes = new Uint8Array(await readFile(resolve('src/test/fixtures/school42', filename)))
  upstream = createServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json')
    try {
      if (req.method === 'HEAD' && req.url === '/api/transport-probe') {
        probeHeader = req.headers['idempotency-key']
        res.writeHead(204)
        return res.end()
      }
      if (req.url === '/api/auth/refresh-token') {
        expect(req.headers.authorization).toBe('Bearer fixture-refresh')
        refreshes++
        return res.end(JSON.stringify({ accessToken: 'renewed' }))
      }
      expect(req.method).toBe('POST')
      expect(req.url).toBe(path)
      expect(req.headers['idempotency-key']).toBeUndefined()
      expect(req.headers['content-type']).toMatch(/^multipart\/form-data;\s*boundary=.+/i)
      const chunks: Buffer[] = []
      for await (const chunk of req) chunks.push(chunk)
      const boundary = req.headers['content-type']!.split('boundary=')[1]
      const parts = Buffer.concat(chunks)
        .toString('latin1')
        .split('--' + boundary)
        .slice(1, -1)
      expect(parts).toHaveLength(3)
      const file = parts.find((part) => part.includes('name="file"'))!
      expect(file).toContain(`filename="${filename}"`)
      const fileBytes = Buffer.from(file.slice(file.indexOf('\r\n\r\n') + 4, -2), 'latin1')
      expect(Buffer.compare(fileBytes, bytes)).toBe(0)
      const textParts = parts.map((part) => Buffer.from(part, 'latin1').toString('utf8'))
      expect(textParts.find((part) => part.includes('name="sheet"'))).toContain(
        '\r\n\r\n시수표\r\n',
      )
      const json = textParts.find((part) => part.includes('name="subjectAliases"'))!
      expect(json).toMatch(/Content-Type: application\/json/i)
      expect(JSON.parse(json.slice(json.indexOf('\r\n\r\n') + 4))).toEqual(aliases)
      if (req.headers.authorization === 'Bearer expired') {
        expired++
        res.statusCode = 401
        return res.end('{}')
      }
      expect(req.headers.authorization).toBe('Bearer renewed')
      uploads++
      res.end(
        JSON.stringify({
          sheet: '시수표',
          dataRows: 1,
          totalPeriods: 1,
          demands: [
            { teacherId: '10', subjectId: '20', classId: '30', weeklyPeriods: 1, sourceCell: 'D3' },
          ],
          validatedLoadId,
        }),
      )
    } catch (error) {
      receiverError = error
      res.statusCode = 500
      res.end('{}')
    }
  })
  upstream.listen(0, '127.0.0.1')
  await once(upstream, 'listening')
  const target = 'http://127.0.0.1:' + (upstream.address() as AddressInfo).port
  // Separate process boots the application's installed Vite version and shipped config.
  vite = spawn(
    process.execPath,
    ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '0'],
    {
      env: { ...process.env, API_PROXY_TARGET: target, VITEST: '' },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  )
  const origin = await new Promise<string>((done, fail) => {
    let output = ''
    vite.once('error', fail)
    vite.once('exit', (code) => fail(new Error('Vite exit ' + code + ' ' + output)))
    function read(chunk: Buffer) {
      output += stripVTControlCharacters(chunk.toString())
      const local = output.match(/Local:\s+(http:\/\/127\.0\.0\.1:\d+)/)
      if (local) done(local[1])
    }
    vite.stdout!.on('data', read)
    vite.stderr!.on('data', read)
  })
  jsdom.reconfigure({ url: origin })
}, 15_000)

afterAll(async () => {
  clearTokens()
  if (vite && vite.exitCode === null && !vite.killed) {
    const exited = once(vite, 'exit')
    vite.kill()
    await exited
  }
  if (upstream?.listening) {
    upstream.closeAllConnections()
    await new Promise<void>((done) => upstream.close(() => done()))
  }
})

it('로컬 Vite가 원본 xlsx·시트·JSON을 전달하고 동시 401 후에도 같은 multipart를 재전송한다', async () => {
  expect(API_BASE_URL).toBe('')
  setTokens({ accessToken: 'expired', refreshToken: 'fixture-refresh', userId: 42 })
  const input = { file: new File([bytes], filename), sheet: '시수표', subjectAliases: aliases }
  let validated
  try {
    validated = await Promise.all([
      validateTeachingLoad(547001, input),
      validateTeachingLoad(547001, input),
    ])
  } catch (error) {
    throw receiverError ?? error
  }
  expect(validated.map((row) => row.validatedLoadId)).toEqual([validatedLoadId, validatedLoadId])
  expect(expired).toBe(2)
  expect(refreshes).toBe(1)
  expect(uploads).toBe(2)
})

it('로컬 프록시는 호출자가 지정한 Idempotency-Key를 그대로 전달한다', async () => {
  const key = '177229cb-b51e-4c21-9757-7f4790122000'
  await client.head('/api/transport-probe', { headers: { 'Idempotency-Key': key } })
  expect(probeHeader).toBe(key)
})
