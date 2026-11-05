const H={"Accept":"text/html","Accept-Language":"sv-SE,sv;q=0.9","User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"};
for(const q of ["carbonara","kalops","flygande jacob"]){const r=await fetch("https://www.koket.se/search?searchtext="+encodeURIComponent(q),{headers:H});const t=await r.text();
const i=t.indexOf('\\"categories\\"');console.log("PROBE",q,r.status,"\n",t.slice(Math.max(0,i-1500),i+200).replace(/\s+/g," "));
const urls=[...new Set([...t.matchAll(/\\"(?:url|slug|path)\\":\\"([^\\"]+)\\"/g)].map(m=>m[1]))].slice(0,15);console.log("URLS",JSON.stringify(urls));
await new Promise(r=>setTimeout(r,1500))}
