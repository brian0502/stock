// Fubon DJ broker-branch (分點) parser — Big5
const https = require('https');
const sleep = ms => new Promise(r => setTimeout(r, ms));
function getBuf(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
  });
}
const list = (process.argv[2] || '2330,2317,0050,3231,6770,2454,2382,2408,2303,2360,2542,3532,3037,6278,2344').split(',');
const suffix = process.argv[3] || '';
(async () => {
  for (const s of list) {
    try {
      const buf = await getBuf(`https://fubon-ebrokerdj.fbs.com.tw/z/zc/zco/zco_${s}${suffix}.djhtm`);
      const html = new TextDecoder('big5').decode(buf);
      const text = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<[^>]+>/g, '\n').replace(/&nbsp;/g, ' ');
      const lines = text.split('\n').map(x => x.trim()).filter(x => x);
      // date
      const dm = text.match(/(\d{4}\/\d{1,2}\/\d{1,2})/);
      let idx = -1;
      for (let i = 0; i < lines.length; i++) if (lines[i].includes('佔成交比重')) idx = i;
      const rows = [];
      if (idx >= 0) {
        for (let i = idx + 1; i + 9 < lines.length; i += 10) {
          if (lines[i].includes('合計買超')) break;
          const r = lines.slice(i, i + 10);
          if (r.some(x => x.includes('合計'))) break;
          rows.push(r);
        }
      }
      const tot = lines.filter(x => x.includes('合計買超') || x.includes('平均買超') || x.includes('合計賣超') || x.includes('平均賣超'));
      const totVals = [];
      for (let i = 0; i < lines.length; i++) if (/合計買超張數|平均買超成本|合計賣超張數|平均賣超成本/.test(lines[i])) totVals.push(lines[i] + '=' + (lines[i + 1] || ''));
      console.log(`=== ${s} date=${dm ? dm[1] : '?'} rows=${rows.length}`);
      const num = x => parseFloat(String(x).replace(/,/g, '')) || 0;
      const top = rows.slice(0, 8);
      console.log('  買超: ' + top.map(r => `${r[0]} +${r[3]}(賣/買 ${num(r[1]) ? Math.round(num(r[2]) / num(r[1]) * 100) : '?'}%)`).join(' | '));
      console.log('  賣超: ' + top.map(r => `${r[5]} -${r[8]}(買/賣 ${num(r[7]) ? Math.round(num(r[6]) / num(r[7]) * 100) : '?'}%)`).join(' | '));
      console.log('  ' + totVals.join(' ; '));
    } catch (e) { console.log(s, 'ERR', e.message); }
    await sleep(1200);
  }
})();
