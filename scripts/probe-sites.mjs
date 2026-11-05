const H={"Accept":"text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8","Accept-Language":"sv-SE,sv;q=0.9","User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"};
const urls=[
 "https://www.linasmatkasse.se/recept/46554/asiatisk-flaskfars-med-nudlar-och-koriander",
 "https://www.ica.se/recept/?q=pasta%20carbonara",
 "https://www.ica.se/recept/kramig-pasta-med-kyckling-718338/",
 "https://www.arla.se/recept/?q=pasta%20carbonara",
 "https://www.arla.se/recept/lax-med-citronsas/",
 "https://www.koket.se/sok?searchtext=pasta%20carbonara",
 "https://www.koket.se/snabb-one-pot-pasta",
 "https://www.tv4.se/artikel/7rugdbUmGWPUXLfFd000Wp/snabb-koettfaerssas-med-svamp"];
for(const u of urls){try{const r=await fetch(u,{headers:H});const t=await r.text();
 const ld=[...t.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]);
 const hasRecipe=ld.some(x=>/"@type"\s*:\s*\[?\s*"Recipe"/.test(x));
 const links=[...new Set([...t.matchAll(/href="(\/recept\/[a-z0-9\-]+-\d+\/|https:\/\/www\.arla\.se\/recept\/[a-z0-9\-]+\/|\/[a-z0-9\-]{8,})"/g)].map(m=>m[1]))].slice(0,6);
 console.log("PROBE",r.status,u,"len",t.length,"ld",ld.length,"recipe",hasRecipe,"links",JSON.stringify(links));
 if(hasRecipe){const x=ld.find(x=>/"Recipe"/.test(x));console.log("LD",x.slice(0,900).replace(/\s+/g," "))}
}catch(e){console.log("PROBE ERR",u,e.message)}await new Promise(r=>setTimeout(r,1500))}
