// app/ ve src/ klasörlerinden yayına hazır www/ klasörünü üretir (Android, iPhone web uygulaması ve GitHub Pages için)
import fs from "fs";import path from "path";
const R=path.resolve(path.dirname(new URL(import.meta.url).pathname),"..");const W=path.join(R,"www");
fs.rmSync(W,{recursive:true,force:true});fs.mkdirSync(W,{recursive:true});
const cp=(a,b)=>fs.cpSync(path.join(R,a),path.join(W,b||path.basename(a)),{recursive:true});
const v=JSON.parse(fs.readFileSync(path.join(R,"version.json"),"utf8"));
let body=fs.readFileSync(path.join(R,"app/index.html"),"utf8");
body=body.replace(/<link rel="preconnect"[^>]*>\s*/g,"").replace(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^>]*>/,'<link rel="stylesheet" href="fonts.css">').replace(/<meta name="claude:[^>]*>\s*/g,"");
body=body.replace(/const APP=\{kod:\d+,surum:"[^"]*"\}/,`const APP={kod:${v.kod},surum:${JSON.stringify(v.surum)}}`);
const head=`<!doctype html>\n<html lang="tr">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n<link rel="manifest" href="manifest.webmanifest">\n<link rel="icon" href="icons/icon-192.png">\n<link rel="apple-touch-icon" href="icons/icon-180.png">\n<meta name="apple-mobile-web-app-capable" content="yes">\n<meta name="mobile-web-app-capable" content="yes">\n<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">\n<meta name="apple-mobile-web-app-title" content="Nur Rehberi">\n`;
const capJs=path.join(R,"node_modules/@capacitor/core/dist/capacitor.js");const capVar=fs.existsSync(capJs);
if(capVar)fs.copyFileSync(capJs,path.join(W,"capacitor.js"));
const html=head+(capVar?'<script src="capacitor.js"></script>\n':"")+body.replace(/^<header class="top">/m,'</head>\n<body>\n<header class="top">')+"\n</body>\n</html>\n";
fs.writeFileSync(path.join(W,"index.html"),html);
cp("app/kuran.js");cp("app/ses","ses");cp("app/hadis","hadis");cp("src/fonts","fonts");cp("src/icons","icons");cp("src/fonts.css");cp("src/manifest.webmanifest");cp("version.json");cp("icerik.json");
const fonts=fs.readdirSync(path.join(R,"src/fonts")).map(f=>JSON.stringify("fonts/"+f)).join(",");
fs.writeFileSync(path.join(W,"sw.js"),fs.readFileSync(path.join(R,"src/sw.js"),"utf8").replace("__SURUM__",v.surum+"-"+v.kod).replace("__FONTLAR__",fonts));
fs.writeFileSync(path.join(W,".nojekyll"),"");
console.log("www hazır:",v.surum,"(kod "+v.kod+")");
