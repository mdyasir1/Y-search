import * as XLSX from 'xlsx'
import type { District, Assembly, PollingStation, VoterRecord } from '@/types'

const BASE_URL = 'https://ceoaperolls.ap.gov.in/MLC_Rolls_Print_Final'
const PAGE_URL = `${BASE_URL}/MLCRollsNonPhotoGraduate_ABC.aspx`

const DISTRICTS: District[] = [
  { id: '1', name: 'Srikakulam', nameTelugu: 'శ్రీకాకుళం' },
  { id: '2', name: 'Vizianagaram', nameTelugu: 'విజయనగరం' },
  { id: '3', name: 'Visakhapatnam', nameTelugu: 'విశాఖపట్నం' },
  { id: '4', name: 'East Godavari', nameTelugu: 'తూర్పుగోదావరి' },
  { id: '5', name: 'West Godavari', nameTelugu: 'పశ్చిమగోదావరి' },
  { id: '6', name: 'Krishna', nameTelugu: 'క్రిష్ణ' },
  { id: '7', name: 'Guntur', nameTelugu: 'గుంటూరు' },
  { id: '8', name: 'Prakasam', nameTelugu: 'ప్రకాశం' },
  { id: '9', name: 'Nellore', nameTelugu: 'నెల్లూరు' },
  { id: '10', name: 'Chittoor', nameTelugu: 'చిత్తూరు' },
  { id: '11', name: 'Kadapa', nameTelugu: 'కడప' },
  { id: '12', name: 'Anantapur', nameTelugu: 'అనంతపురం' },
  { id: '13', name: 'Kurnool', nameTelugu: 'కర్నూలు' },
]

interface ViewState {
  viewState: string
  viewStateGenerator: string
  eventValidation: string
}

function extractViewState(html: string): ViewState {
  const get = (name: string) => {
    const m = html.match(new RegExp(`id="${name}"\\s+value="([^"]*)"`))
    return m ? m[1].replace(/&#(\d+);/g, (_, c) => String.fromCharCode(parseInt(c, 10))) : ''
  }
  return {
    viewState: get('__VIEWSTATE'),
    viewStateGenerator: get('__VIEWSTATEGENERATOR'),
    eventValidation: get('__EVENTVALIDATION'),
  }
}

function extractOptions(html: string, selectId: string): { id: string; text: string }[] {
  const results: { id: string; text: string }[] = []
  const re = new RegExp(`<select[^>]*id="${selectId}"[^>]*>(.*?)</select>`, 's')
  const m = html.match(re)
  if (!m) return results
  const optRe = /<option[^>]*value="([^"]+)"[^>]*>([^<]+)<\/option>/g
  let match: RegExpExecArray | null
  while ((match = optRe.exec(m[1])) !== null) {
    if (match[1] === '0') continue
    results.push({ id: match[1], text: match[2].trim() })
  }
  return results
}

async function postback(
  formData: Record<string, string>,
  cookie: string,
): Promise<{ html: string; viewState: ViewState; cookie: string }> {
  const resp = await fetch(PAGE_URL, {
    method: 'POST',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: cookie,
    },
    body: new URLSearchParams(formData).toString(),
    redirect: 'manual',
  })
  const html = await resp.text()
  const setCookie = resp.headers.get('set-cookie') || ''
  const newCookie = setCookie.split(';')[0] || cookie
  return { html, viewState: extractViewState(html), cookie: newCookie }
}

async function initialFetch(): Promise<{ viewState: ViewState; cookie: string }> {
  const resp = await fetch(PAGE_URL, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
  })
  const html = await resp.text()
  const setCookie = resp.headers.get('set-cookie') || ''
  return { viewState: extractViewState(html), cookie: setCookie.split(';')[0] }
}

export function getDistricts(): District[] {
  return DISTRICTS
}

export async function getAssemblies(districtId: string): Promise<Assembly[]> {
  const { viewState, cookie } = await initialFetch()
  const r = await postback({
    __VIEWSTATE: viewState.viewState,
    __VIEWSTATEGENERATOR: viewState.viewStateGenerator,
    __EVENTVALIDATION: viewState.eventValidation,
    __EVENTTARGET: 'ddlAC',
    __EVENTARGUMENT: '',
    ddlAC: districtId,
    ddlDist: '0',
    ddlmandal: '0',
  }, cookie)
  return extractOptions(r.html, 'ddlDist').map(o => ({
    id: o.id,
    name: o.text,
    nameTelugu: o.text,
  }))
}

export async function getPollingStations(districtId: string, acId: string): Promise<PollingStation[]> {
  const { viewState, cookie } = await initialFetch()
  const r1 = await postback({
    __VIEWSTATE: viewState.viewState,
    __VIEWSTATEGENERATOR: viewState.viewStateGenerator,
    __EVENTVALIDATION: viewState.eventValidation,
    __EVENTTARGET: 'ddlAC',
    __EVENTARGUMENT: '',
    ddlAC: districtId,
    ddlDist: '0',
    ddlmandal: '0',
  }, cookie)
  const r2 = await postback({
    __VIEWSTATE: r1.viewState.viewState,
    __VIEWSTATEGENERATOR: r1.viewState.viewStateGenerator,
    __EVENTVALIDATION: r1.viewState.eventValidation,
    __EVENTTARGET: 'ddlDist',
    __EVENTARGUMENT: '',
    ddlAC: districtId,
    ddlDist: acId,
    ddlmandal: '0',
  }, r1.cookie)
  return extractOptions(r2.html, 'ddlmandal').map(o => ({
    id: o.id,
    name: o.text.replace(/^\d+-/, ''),
    nameTelugu: o.text,
  }))
}

async function doFullPostbackFlow(districtId: string, acId: string, psId: string): Promise<{ html: string; cookie: string }> {
  const init = await initialFetch()
  const r1 = await postback({
    __VIEWSTATE: init.viewState.viewState,
    __VIEWSTATEGENERATOR: init.viewState.viewStateGenerator,
    __EVENTVALIDATION: init.viewState.eventValidation,
    __EVENTTARGET: 'ddlAC', __EVENTARGUMENT: '',
    ddlAC: districtId, ddlDist: '0', ddlmandal: '0',
  }, init.cookie)
  const r2 = await postback({
    __VIEWSTATE: r1.viewState.viewState,
    __VIEWSTATEGENERATOR: r1.viewState.viewStateGenerator,
    __EVENTVALIDATION: r1.viewState.eventValidation,
    __EVENTTARGET: 'ddlDist', __EVENTARGUMENT: '',
    ddlAC: districtId, ddlDist: acId, ddlmandal: '0',
  }, r1.cookie)
  const r3 = await postback({
    __VIEWSTATE: r2.viewState.viewState,
    __VIEWSTATEGENERATOR: r2.viewState.viewStateGenerator,
    __EVENTVALIDATION: r2.viewState.eventValidation,
    __EVENTTARGET: '', __EVENTARGUMENT: '',
    ddlAC: districtId, ddlDist: acId, ddlmandal: psId,
    btnGetPollingStations: 'Get Data',
  }, r2.cookie)
  return { html: r3.html, cookie: r3.cookie }
}

export async function fetchPsExcel(
  districtId: string,
  acId: string,
  psId: string,
): Promise<{ voters: VoterRecord[] }> {
  const { html, cookie } = await doFullPostbackFlow(districtId, acId, psId)
  const cidMatch = html.match(/ControlID=([a-f0-9-]+)/i)
  if (!cidMatch) return { voters: [] }

  const cid = cidMatch[1]
  const exportUrl = `${BASE_URL}/Reserved.ReportViewerWebControl.axd?Culture=16393&CultureOverrides=True&UICulture=1033&UICultureOverrides=True&ReportStack=1&ControlID=${cid}&Mode=true&OpType=Export&FileName=ReportABC&ContentDisposition=OnlyHtmlInline&Format=EXCELOPENXML`

  const resp = await fetch(exportUrl, {
    headers: { Cookie: cookie, 'User-Agent': 'Mozilla/5.0' },
  })
  if (!resp.ok) return { voters: [] }

  const buf = await resp.arrayBuffer()
  const voters = parseExcelVoters(new Uint8Array(buf), psId)
  return { voters }
}

export async function fetchAllPsData(
  districtId: string,
  acId: string,
  pollingStations: PollingStation[],
  onProgress?: (done: number, total: number) => void,
): Promise<VoterRecord[]> {
  const allVoters: VoterRecord[] = []
  for (let i = 0; i < pollingStations.length; i++) {
    try {
      const { voters } = await fetchPsExcel(districtId, acId, pollingStations[i].id)
      allVoters.push(...voters)
    } catch {
      // skip failed PS
    }
    onProgress?.(i + 1, pollingStations.length)
  }
  return allVoters
}

function parseExcelVoters(data: Uint8Array, psId: string): VoterRecord[] {
  try {
    const workbook = XLSX.read(data, { type: 'array' })
    const ws = workbook.Sheets['Sheet2']
    if (!ws) return []

    const rows = XLSX.utils.sheet_to_json<any>(ws, { header: 1, defval: '' })
    const voters: VoterRecord[] = []
    let headerPassed = false

    for (const row of rows) {
      if (!Array.isArray(row) || row.length < 7) continue
      const serial = String(row[0] ?? '').trim()
      if (!serial || serial === 'వరుస సంఖ్య.' || serial === '(1)') {
        headerPassed = true
        continue
      }
      if (!headerPassed) continue
      if (!/^\d+$/.test(serial)) continue

      voters.push({
        serial,
        house: String(row[1] ?? '').trim(),
        name: String(row[2] ?? '').trim(),
        rel_type: String(row[3] ?? '').trim(),
        rel_name: String(row[4] ?? '').trim(),
        gender: String(row[5] ?? '').trim(),
        age: String(row[6] ?? '').trim(),
        epic: String(row[7] ?? '').trim(),
        part: psId,
        ac_name: '',
        district: '',
      })
    }
    return voters
  } catch {
    return []
  }
}
