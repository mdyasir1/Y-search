const BASE_URL = 'https://ceoaperolls.ap.gov.in/MLC_Rolls_Print_Final'
const PAGE_URL = `${BASE_URL}/MLCRollsNonPhotoGraduate_ABC.aspx`

function extractViewState(html) {
  const get = (name) => {
    const m = html.match(new RegExp(`id="${name}"\\s+value="([^"]*)"`))
    return m ? m[1].replace(/&#(\d+);/g, (_, c) => String.fromCharCode(c)) : ''
  }
  return {
    viewState: get('__VIEWSTATE'),
    viewStateGenerator: get('__VIEWSTATEGENERATOR'),
    eventValidation: get('__EVENTVALIDATION'),
  }
}

async function step(desc, postData, cookie) {
  console.log(`\n=== ${desc} ===`)
  const resp = await fetch(PAGE_URL, {
    method: postData ? 'POST' : 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: cookie || '',
    },
    body: postData ? new URLSearchParams(postData).toString() : undefined,
  })
  const html = await resp.text()
  const setCookie = resp.headers.get('set-cookie') || ''
  const newCookie = setCookie ? setCookie.split(';')[0] : (cookie || '')
  const vs = extractViewState(html)
  return { html, vs, cookie: newCookie }
}

async function main() {
  let s = await step('GET page', null, '')
  console.log('Districts loaded')

  s = await step('Select District=6', {
    __VIEWSTATE: s.vs.viewState,
    __VIEWSTATEGENERATOR: s.vs.viewStateGenerator,
    __EVENTVALIDATION: s.vs.eventValidation,
    __EVENTTARGET: 'ddlAC',
    __EVENTARGUMENT: '',
    ddlAC: '6',
    ddlDist: '0',
    ddlmandal: '0',
  }, s.cookie)
  console.log('ACs loaded')

  s = await step('Select AC=78', {
    __VIEWSTATE: s.vs.viewState,
    __VIEWSTATEGENERATOR: s.vs.viewStateGenerator,
    __EVENTVALIDATION: s.vs.eventValidation,
    __EVENTTARGET: 'ddlDist',
    __EVENTARGUMENT: '',
    ddlAC: '6',
    ddlDist: '78',
    ddlmandal: '0',
  }, s.cookie)
  console.log('PS loaded')

  s = await step('Get Data PS=1', {
    __VIEWSTATE: s.vs.viewState,
    __VIEWSTATEGENERATOR: s.vs.viewStateGenerator,
    __EVENTVALIDATION: s.vs.eventValidation,
    __EVENTTARGET: '',
    __EVENTARGUMENT: '',
    ddlAC: '6',
    ddlDist: '78',
    ddlmandal: '1',
    btnGetPollingStations: 'Get Data',
  }, s.cookie)

  const cidMatch = s.html.match(/ControlID=([a-f0-9-]+)/i)
  if (!cidMatch) { console.log('No ControlID found'); return }

  const controlId = cidMatch[1]
  console.log('ControlID:', controlId)

  const exportUrl = `${BASE_URL}/Reserved.ReportViewerWebControl.axd?Culture=16393&CultureOverrides=True&UICulture=1033&UICultureOverrides=True&ReportStack=1&ControlID=${controlId}&Mode=true&OpType=Export&FileName=ReportABC&ContentDisposition=OnlyHtmlInline&Format=EXCELOPENXML`

  // Export WITH cookie
  console.log('\n=== Exporting Excel ===')
  const exportResp = await fetch(exportUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      Cookie: s.cookie,
    },
  })
  console.log('Status:', exportResp.status)
  console.log('Content-Type:', exportResp.headers.get('content-type'))
  const buf = await exportResp.arrayBuffer()
  console.log('Size:', buf.byteLength, 'bytes')

  // If successful, save it
  if (exportResp.ok) {
    const fs = await import('fs')
    fs.writeFileSync('/tmp/test_export.xlsx', Buffer.from(buf))
    console.log('Saved to /tmp/test_export.xlsx')
  }
}

main().catch(console.error)
