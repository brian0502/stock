// 檔案更新共用工具（2026-09-10 入庫・不要再重寫）
// 用法：node tools/apply.js changes.js  ← changes.js 匯出 function(api){ ... } 只寫內容，不寫機制
// api：rd(f) 讀檔 / wr(f,s) 寫檔 / rep(s,a,b) 字串取代(找不到即拋錯) / repRe(s,re,fn) 正則取代
//      prependRow(c,prefix,seg)：current_strategy 🧊 表＝在以 prefix 開頭的列第 2 格前面插入 seg
//      prependStatus(c,prefix,newShares,seg)：current_strategy 持股現況＝改第 2 格股數、第 4 格狀態前插 seg
//      replaceBlock(s,startMarker,endMarker,newBlock)：整段取代（如 data.js actionBoard）
// 跑完自動 node --check data.js
const fs = require('fs'); const path = require('path'); const cp = require('child_process');
const R = path.resolve(__dirname, '..') + '/';
const api = {
  R,
  rd: f => fs.readFileSync(R + f, 'utf8'),
  wr: (f, s) => fs.writeFileSync(R + f, s),
  rep: (s, a, b) => { if (!s.includes(a)) throw new Error('NOT FOUND: ' + a.slice(0, 80)); return s.split(a).join(b); },
  repRe: (s, re, fn) => { if (!re.test(s)) throw new Error('RE NOT FOUND: ' + re); return s.replace(re, fn); },
  prependRow: (c, prefix, seg) => { const i = c.indexOf(prefix); if (i < 0) throw new Error('row not found: ' + prefix); const j = c.indexOf(' | ', i + prefix.length); return c.slice(0, j + 3) + seg + c.slice(j + 3); },
  prependStatus: (c, prefix, newShares, seg) => {
    const i = c.indexOf(prefix); if (i < 0) throw new Error('status row not found: ' + prefix);
    const end = c.indexOf('\n', i); const row = c.slice(i, end); let cells = row.split(' | ');
    for (let k = 1; k < cells.length; k++) if (cells[k].startsWith('| ')) cells.splice(k, 1, '', cells[k].slice(2));
    if (cells.length < 5) throw new Error('cells ' + prefix + ' ' + cells.length);
    if (newShares) cells[1] = newShares; cells[3] = seg + cells[3];
    return c.slice(0, i) + cells.join(' | ') + c.slice(end);
  },
  replaceBlock: (s, startMarker, endMarker, newBlock) => { const a = s.indexOf(startMarker), b = s.indexOf(endMarker, a); if (a < 0 || b < 0) throw new Error('block markers'); return s.slice(0, a) + newBlock + s.slice(b); },
};
const changes = require(path.resolve(process.argv[2]));
changes(api);
cp.execSync('node --check "' + R + 'data.js"', { stdio: 'inherit' });
console.log('apply OK + data.js syntax OK');
