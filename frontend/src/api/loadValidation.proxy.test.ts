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
import { getGenerationStatus, submitGeneration } from './generationJobs'
import { approveLessonChange } from './lessonChanges'
import { publishCandidate } from './publications'
import { validateTeachingLoad } from './loadValidation'
import { clearTokens, setTokens } from './tokenStorage.js'

declare const jsdom: { reconfigure(options: { url: string }): void }
const path = '/api/v2/terms/547001/load-imports/validate?forGeneration=true'
const filename = 'teaching_load_42.xlsx'
const aliases = { 공수1: 20 }
const validatedLoadId = '375d0754-c375-42c6-b1f0-f630a9693e37'
const generationPath = '/api/v2/terms/547001/generations'
const jobId = '7eb15cc6-193f-4519-9704-50035ae28371'
const statusUrl = generationPath + '/' + jobId
const publication = {
  jobId,
  candidateId: '0'.repeat(63) + 'a',
  effectiveFrom: '2026-11-23',
  expectedPublishRev: 0,
}
let vite: ChildProcess
let upstream: Server
let bytes: Uint8Array<ArrayBuffer>
let receiverError: unknown
let refreshes = 0
let uploads = 0
let expired = 0
let probeHeader: string | string[] | undefined
const approvalBodies: unknown[] = []
const approvalKeys: (string | string[] | undefined)[] = []

beforeAll(async () => {
  bytes = new Uint8Array(await readFile(resolve('src/test/fixtures/school42', filename)))
  upstream = createServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json')
    try {
      if (req.method === 'POST' && req.url === '/api/v2/terms/547001/lesson-changes/101/approval') {
        const chunks: Buffer[] = []
        for await (const chunk of req) chunks.push(chunk)
        approvalBodies.push(JSON.parse(Buffer.concat(chunks).toString()))
        approvalKeys.push(req.headers['idempotency-key'])
        if (req.headers.authorization === 'Bearer approval-expired') {
          res.writeHead(401)
          return res.end('{}')
        }
        expect(req.headers.authorization).toBe('Bearer approval-renewed')
        return res.end(
          JSON.stringify({
            requestId: 101,
            requestRev: 2,
            state: 'APPROVED',
            lessons: [
              {
                id: 51,
                rev: 1,
                originId: 31,
                termId: 547001,
                versionId: 83,
                classId: 30,
                subjectId: 20,
                date: '2026-11-23',
                originDate: '2026-11-23',
                planned: { teacherId: 10, periodId: 1 },
                actual: { teacherId: 19, periodId: 1 },
              },
            ],
          }),
        )
      }
      if (req.method === 'POST' && req.url === '/api/v2/terms/547001/publications') {
        expect(req.headers.authorization).toBe('Bearer publication-test')
        const chunks: Buffer[] = []
        for await (const chunk of req) chunks.push(chunk)
        expect(JSON.parse(Buffer.concat(chunks).toString())).toEqual(publication)
        res.writeHead(201)
        return res.end(JSON.stringify({ versionId: 83, publishRev: 1, weeklyLessons: 672 }))
      }
      if (req.method === 'POST' && req.url === generationPath) {
        expect(req.headers.authorization).toBe('Bearer generation-test')
        const chunks: Buffer[] = []
        for await (const chunk of req) chunks.push(chunk)
        expect(JSON.parse(Buffer.concat(chunks).toString())).toEqual({ validatedLoadId })
        res.writeHead(202, { Location: statusUrl, 'Retry-After': '2' })
        return res.end(JSON.stringify({ jobId, state: 'QUEUED', expectedPublishRev: 0, statusUrl }))
      }
      if (req.method === 'GET' && req.url === statusUrl) {
        expect(req.headers.authorization).toBe('Bearer generation-test')
        return res.end(
          JSON.stringify({ jobId, state: 'RUNNING', expectedPublishRev: 0, result: null }),
        )
      }
      if (req.method === 'HEAD' && req.url === '/api/transport-probe') {
        probeHeader = req.headers['idempotency-key']
        res.writeHead(204)
        return res.end()
      }
      if (req.url === '/api/auth/refresh-token') {
        if (req.headers.authorization === 'Bearer approval-refresh') {
          return res.end(JSON.stringify({ accessToken: 'approval-renewed' }))
        }
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

it('실제 승인 경로에서 Vite 프록시와 공유 Axios의 401 재전송이 본문과 같은 승인 키를 전달한다', async () => {
  setTokens({ accessToken: 'approval-expired', refreshToken: 'approval-refresh', userId: 42 })
  const key = crypto.randomUUID()
  const body = { expectedRequestRev: 1, expectedLessonRev: 0 }
  try {
    expect(await approveLessonChange(547001, 101, body, key)).toMatchObject({
      state: 'APPROVED',
      lessons: [{ id: 51, actual: { teacherId: 19 } }],
    })
  } catch (error) {
    throw receiverError ?? error
  }
  expect(approvalBodies).toEqual([body, body])
  expect(approvalKeys).toEqual([key, key])
})

it('로컬 Vite를 통해 편성 작업을 접수하고 202의 상대 statusUrl을 그대로 조회한다', async () => {
  setTokens({ accessToken: 'generation-test', userId: 42 })
  try {
    const receipt = await submitGeneration(547001, { validatedLoadId })
    expect(receipt.statusUrl).toBe(statusUrl)
    const job = await getGenerationStatus(547001, receipt)
    expect(job).toEqual({ jobId, state: 'RUNNING', expectedPublishRev: 0, result: null })
  } catch (error) {
    throw receiverError ?? error
  }
})

it('로컬 Vite가 게시 본문의 네 필드와 인증 헤더를 전달하고 201 영수증을 반환한다', async () => {
  setTokens({ accessToken: 'publication-test', userId: 42 })
  try {
    expect(await publishCandidate(547001, publication)).toEqual({
      versionId: 83,
      publishRev: 1,
      weeklyLessons: 672,
    })
  } catch (error) {
    throw receiverError ?? error
  }
})
