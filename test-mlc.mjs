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

function extractOptions(html, selectId) {
  const results = []
  const selectRegex = new RegExp(`<select[^>]*id="${selectId}"[^>]*>(.*?)</select>`, 's')
  const selectMatch = html.match(selectRegex)
  if (!selectMatch) return results
  const optionRegex = /<option[^>]*value="([^"]+)"[^>]*>([^<]+)<\/option>/g
  let m
  while ((m = optionRegex.exec(selectMatch[1])) !== null) {
    if (m[1] === '0') continue
    results.push({ id: m[1], name: m[2].trim() })
  }
  return results
}

async function step(desc, url, postData, cookie) {
  console.log(`\n=== ${desc} ===`)
  const resp = await fetch(url, {
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
  console.log('Cookie:', newCookie ? 'got' : 'none')
  console.log('ViewState:', vs.viewState.slice(0, 40) + '...')
  return { html, vs, cookie: newCookie }
}

async function main() {
  // Step 1: GET initial page
  const s1 = await step('GET page', PAGE_URL, null, '')
  
  // Extract districts from ddlAC
  const districts = extractOptions(s1.html, 'ddlAC')
  console.log(`Districts (${districts.length}):`, districts.slice(0, 3).map(d => `${d.id}:${d.name}`))

  // Step 2: POST - select district 6 (Krishna)
  const s2 = await step('Select District=6 (Krishna)', PAGE_URL, {
    __VIEWSTATE: s1.vs.viewState,
    __VIEWSTATEGENERATOR: s1.vs.viewStateGenerator,
    __EVENTVALIDATION: s1.vs.eventValidation,
    __EVENTTARGET: 'ddlAC',
    __EVENTARGUMENT: '',
    ddlAC: '6',
    ddlDist: '0',
    ddlmandal: '0',
  }, s1.cookie)

  // Extract ACs from ddlDist
  const acs = extractOptions(s2.html, 'ddlDist')
  console.log(`\nACs for Krishna (${acs.length}):`)
  acs.slice(0, 5).forEach(a => console.log(`  ${a.id}: ${a.name}`))

  // Step 3: POST - select AC 78 (Vijayawada East)
  const s3 = await step('Select AC=78 (Vijayawada East)', PAGE_URL, {
    __VIEWSTATE: s2.vs.viewState,
    __VIEWSTATEGENERATOR: s2.vs.viewStateGenerator,
    __EVENTVALIDATION: s2.vs.eventValidation,
    __EVENTTARGET: 'ddlDist',
    __EVENTARGUMENT: '',
    ddlAC: '6',
    ddlDist: '78',
    ddlmandal: '0',
  }, s2.cookie)

  // Extract PS from ddlmandal
  const stations = extractOptions(s3.html, 'ddlmandal')
  console.log(`\nPS for AC 78 (${stations.length}):`)
  stations.slice(0, 5).forEach(s => console.log(`  ${s.id}: ${s.name}`))

  // Step 4: POST - click "Get Data" button
  const s4 = await step('Click Get Data', PAGE_URL, {
    __VIEWSTATE: s3.vs.viewState,
    __VIEWSTATEGENERATOR: s3.vs.viewStateGenerator,
    __EVENTVALIDATION: s3.vs.eventValidation,
    __EVENTTARGET: '',
    __EVENTARGUMENT: '',
    ddlAC: '6',
    ddlDist: '78',
    ddlmandal: '1',
    btnGetPollingStations: 'Get Data',
  }, s3.cookie)

  const cidMatch = s4.html.match(/ControlID=([a-f0-9-]+)/i)
  if (cidMatch) {
    console.log(`\nControlID found: ${cidMatch[1]}`)
    const exportUrl = `${BASE_URL}/Reserved.ReportViewerWebControl.axd?Culture=16393&CultureOverrides=True&UICulture=1033&UICultureOverrides=True&ReportStack=1&ControlID=${cidMatch[1]}&Mode=true&OpType=Export&FileName=ReportABC&ContentDisposition=OnlyHtmlInline&Format=EXCELOPENXML`
    console.log(`Export URL: ${exportUrl}`)
  } else {
    console.log('\nControlID NOT found')
    const snippet = s4.html.substring(Math.max(0, s4.html.indexOf('ReportViewer') - 200), s4.html.indexOf('ReportViewer') + 300)
    console.log('Snippet around ReportViewer:', snippet.substring(0, 500))
  }
}

main().catch(console.error)
