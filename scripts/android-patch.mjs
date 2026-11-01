// "npx cap add android" sonrası: izinler, sürüm numarası
import fs from "fs";
const v=JSON.parse(fs.readFileSync("version.json","utf8"));
const mf="android/app/src/main/AndroidManifest.xml";let m=fs.readFileSync(mf,"utf8");
const izin=["android.permission.INTERNET","android.permission.RECORD_AUDIO","android.permission.ACCESS_COARSE_LOCATION","android.permission.ACCESS_FINE_LOCATION","android.permission.VIBRATE"];
izin.forEach(p=>{if(!m.includes(`"${p}"`))m=m.replace("</manifest>",`    <uses-permission android:name="${p}" />\n</manifest>`)});
if(!m.includes("<queries>"))m=m.replace("</manifest>",`    <queries>\n        <intent><action android:name="android.speech.RecognitionService" /></intent>\n        <intent><action android:name="android.intent.action.TTS_SERVICE" /></intent>\n        <intent><action android:name="android.intent.action.VIEW" /><data android:scheme="https" /></intent>\n    </queries>\n</manifest>`);
fs.writeFileSync(mf,m);
const gf="android/app/build.gradle";let g=fs.readFileSync(gf,"utf8");
g=g.replace(/versionCode \d+/,`versionCode ${v.kod}`).replace(/versionName "[^"]*"/,`versionName "${v.surum}"`);
fs.writeFileSync(gf,g);console.log("Android ayarlandı:",v.surum,v.kod);
