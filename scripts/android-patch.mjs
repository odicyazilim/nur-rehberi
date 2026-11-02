// "npx cap add android" sonrası: izinler, sürüm numarası
import fs from "fs";
const v=JSON.parse(fs.readFileSync("apk.json","utf8")); // yerel uygulama (APK) sürümü
const mf="android/app/src/main/AndroidManifest.xml";let m=fs.readFileSync(mf,"utf8");
const izin=["android.permission.INTERNET","android.permission.RECORD_AUDIO","android.permission.ACCESS_COARSE_LOCATION","android.permission.ACCESS_FINE_LOCATION","android.permission.VIBRATE"];
izin.forEach(p=>{if(!m.includes(`"${p}"`))m=m.replace("</manifest>",`    <uses-permission android:name="${p}" />\n</manifest>`)});
if(!m.includes("<queries>"))m=m.replace("</manifest>",`    <queries>\n        <intent><action android:name="android.speech.RecognitionService" /></intent>\n        <intent><action android:name="android.intent.action.TTS_SERVICE" /></intent>\n        <intent><action android:name="android.intent.action.VIEW" /><data android:scheme="https" /></intent>\n    </queries>\n</manifest>`);
fs.writeFileSync(mf,m);
const gf="android/app/build.gradle";let g=fs.readFileSync(gf,"utf8");
g=g.replace(/versionCode \d+/,`versionCode ${v.kod}`).replace(/versionName "[^"]*"/,`versionName "${v.surum}"`);
fs.writeFileSync(gf,g);console.log("Android ayarlandı:",v.surum,v.kod);

// Ses tanıma sırasında Android'in bip seslerini kısan küçük yerel eklenti (SesSustur)
const pk="android/app/src/main/java/com/odicyazilim/nurrehberi";fs.mkdirSync(pk,{recursive:true});
fs.writeFileSync(pk+"/SesSusturPlugin.java",`package com.odicyazilim.nurrehberi;

import android.content.Context;
import android.media.AudioManager;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "SesSustur")
public class SesSusturPlugin extends Plugin {
    private static final int[] AKIS = { AudioManager.STREAM_MUSIC, AudioManager.STREAM_NOTIFICATION, AudioManager.STREAM_SYSTEM };
    private boolean kisik = false;

    private void ayarla(boolean sus) {
        AudioManager a = (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
        if (a == null || kisik == sus) return;
        for (int s : AKIS) {
            try { a.adjustStreamVolume(s, sus ? AudioManager.ADJUST_MUTE : AudioManager.ADJUST_UNMUTE, 0); } catch (Exception e) { }
        }
        kisik = sus;
    }

    @PluginMethod
    public void sustur(PluginCall call) { ayarla(true); call.resolve(); }

    @PluginMethod
    public void ac(PluginCall call) { ayarla(false); call.resolve(); }

    // uygulama arka plana geçerse veya kapanırsa ses mutlaka geri açılır
    @Override
    protected void handleOnPause() { ayarla(false); super.handleOnPause(); }

    @Override
    protected void handleOnDestroy() { ayarla(false); super.handleOnDestroy(); }
}
`);
fs.writeFileSync(pk+"/MainActivity.java",`package com.odicyazilim.nurrehberi;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(SesSusturPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
`);
console.log("SesSustur eklentisi eklendi");
