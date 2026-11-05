const H={"Accept":"text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8","Accept-Language":"sv-SE,sv;q=0.9","User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"};
const urls=[
 "https://html.duckduckgo.com/html/?q=site%3Akoket.se+pasta+carbonara",
 "https://www.bing.com/search?q=site%3Akoket.se+pasta+carbonara",
 "https://www.koket.se/sok?q=pasta%20carbonara",
 "https://www.koket.se/search?searchtext=carbonara",
 "https://www.coop.se/recept/pasta-carbonara/",
 "https://www.zeta.nu/recept/pasta-carbonara/",
 "https://www.mathem.se/se/recipes/",
 "https://www.arla.se/recept/lax-med-citronsas/"];
for(const u of urls){try{const r=await fetch(u,{headers:H});const t=await r.text();
 const ld=[...t.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]);
 const hasRecipe=ld.some(x=>/"Recipe"/.test(x));
 const kl=[...new Set([...t.matchAll(/https?:\/\/www\.koket\.se\/[a-z0-9\-]+/g)].map(m=>m[0]))].slice(0,5);
 const ing=t.indexOf("ngredien");
 console.log("PROBE",r.status,u,"len",t.length,"ld",ld.length,"recipe",hasRecipe,"koketlinks",JSON.stringify(kl),"ingIdx",ing, ing>0?t.slice(ing-150,ing+250).replace(/\s+/g," "):"");
 if(u.includes("arla")){const m=t.match(/(__NEXT_DATA__|window\.__[A-Z_]+__|"ingredients"\s*:)/);console.log("ARLA",m&&m[0], t.match(/itemprop="recipeIngredient"/g)?.length)}
}catch(e){console.log("PROBE ERR",u,e.message)}await new Promise(r=>setTimeout(r,1500))}
