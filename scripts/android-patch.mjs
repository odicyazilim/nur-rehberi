// "npx cap add android" sonrası: izinler, sürüm numarası
import fs from "fs";
const v=JSON.parse(fs.readFileSync("apk.json","utf8")); // yerel uygulama (APK) sürümü
const mf="android/app/src/main/AndroidManifest.xml";let m=fs.readFileSync(mf,"utf8");
const izin=["android.permission.INTERNET","android.permission.RECORD_AUDIO","android.permission.MODIFY_AUDIO_SETTINGS","android.permission.ACCESS_COARSE_LOCATION","android.permission.ACCESS_FINE_LOCATION","android.permission.VIBRATE","android.permission.POST_NOTIFICATIONS","android.permission.USE_EXACT_ALARM","android.permission.USE_FULL_SCREEN_INTENT","android.permission.WAKE_LOCK","android.permission.FOREGROUND_SERVICE","android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK","android.permission.RECEIVE_BOOT_COMPLETED","android.permission.REQUEST_INSTALL_PACKAGES","android.permission.USE_BIOMETRIC","android.permission.CAMERA"];
izin.forEach(p=>{if(!m.includes(`"${p}"`))m=m.replace("</manifest>",`    <uses-permission android:name="${p}" />\n</manifest>`)});
if(!m.includes("<queries>"))m=m.replace("</manifest>",`    <queries>\n        <intent><action android:name="android.speech.RecognitionService" /></intent>\n        <intent><action android:name="android.intent.action.TTS_SERVICE" /></intent>\n        <intent><action android:name="android.intent.action.VIEW" /><data android:scheme="https" /></intent>\n    </queries>\n</manifest>`);
if(!m.includes("SCHEDULE_EXACT_ALARM"))m=m.replace("</manifest>",`    <uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" android:maxSdkVersion="32" />\n</manifest>`);
if(!m.includes(".EzanService"))m=m.replace("</application>",`    <receiver android:name=".EzanReceiver" android:exported="false" />
        <receiver android:name=".EzanBoot" android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.BOOT_COMPLETED" />
                <action android:name="android.intent.action.MY_PACKAGE_REPLACED" />
                <action android:name="android.intent.action.TIME_SET" />
                <action android:name="android.intent.action.TIMEZONE_CHANGED" />
            </intent-filter>
        </receiver>
        <service android:name=".EzanService" android:exported="false" android:foregroundServiceType="mediaPlayback" />
        <activity android:name=".EzanActivity" android:exported="false" android:showWhenLocked="true" android:turnScreenOn="true" android:launchMode="singleTask" android:taskAffinity="com.odicyazilim.nurrehberi.ezan" android:excludeFromRecents="true" android:screenOrientation="portrait" android:theme="@android:style/Theme.Black.NoTitleBar.Fullscreen" />
    </application>`);
if(!m.includes(".CanliActivity"))m=m.replace("</application>",`    <activity android:name=".CanliActivity" android:exported="false" android:configChanges="orientation|screenSize|screenLayout|keyboardHidden|smallestScreenSize" android:theme="@android:style/Theme.Black.NoTitleBar" android:hardwareAccelerated="true" />
        <receiver android:name=".NurWidget" android:exported="false" android:label="Nur Rehberi Vakitler">
            <intent-filter><action android:name="android.appwidget.action.APPWIDGET_UPDATE" /></intent-filter>
            <meta-data android:name="android.appwidget.provider" android:resource="@xml/nur_widget_info" />
        </receiver>
    </application>`);
if(!m.includes("androidx.core.content.FileProvider"))m=m.replace("</application>",`    <provider android:name="androidx.core.content.FileProvider" android:authorities="\${applicationId}.fileprovider" android:exported="false" android:grantUriPermissions="true">
            <meta-data android:name="android.support.FILE_PROVIDER_PATHS" android:resource="@xml/file_paths" />
        </provider>
    </application>`);
if(!m.includes("android.hardware.camera"))m=m.replace("</manifest>",`    <uses-feature android:name="android.hardware.camera" android:required="false" />\n</manifest>`);
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
        registerPlugin(EzanPlugin.class);
        registerPlugin(NurYerelPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
`);
console.log("SesSustur eklentisi eklendi");

// ---- Ezan alarmı: uygulama kapalı / telefon kilitliyken vakit girince ezan + kilit ekranında tam ekran ----
const J=(ad,kod)=>fs.writeFileSync(pk+"/"+ad+".java","package com.odicyazilim.nurrehberi;\n\n"+kod);
J("EzanZaman",`import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import org.json.JSONArray;
import org.json.JSONObject;

public class EzanZaman {
    static SharedPreferences tercih(Context c) { return c.getSharedPreferences("ezan", Context.MODE_PRIVATE); }

    static PendingIntent niyet(Context c, int i, JSONObject o) {
        Intent n = new Intent(c, EzanReceiver.class).setAction("com.odicyazilim.nurrehberi.EZAN." + i);
        if (o != null) {
            n.putExtra("k", o.optString("k", "ogle"));
            n.putExtra("ad", o.optString("ad", ""));
            n.putExtra("saat", o.optString("saat", ""));
            n.putExtra("yer", o.optString("yer", ""));
            n.putExtra("t", o.optLong("t", 0));
        }
        return PendingIntent.getBroadcast(c, 7300 + i, n, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    static boolean tamAlarm(Context c) {
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        return Build.VERSION.SDK_INT < 31 || am.canScheduleExactAlarms();
    }

    // Kayıtlı listeyi okuyup gelecekteki vakitleri kurar; kurulan sayısını döndürür
    static int kur(Context c) {
        SharedPreferences p = tercih(c);
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        int eski = p.getInt("adet", 0);
        for (int i = 0; i < eski; i++) { try { am.cancel(niyet(c, i, null)); } catch (Exception e) { } }
        int adet = 0;
        try {
            JSONArray a = new JSONArray(p.getString("liste", "[]"));
            long simdi = System.currentTimeMillis();
            boolean tam = tamAlarm(c);
            for (int i = 0; i < a.length() && adet < 400; i++) {
                JSONObject o = a.getJSONObject(i);
                long t = o.optLong("t", 0);
                if (t <= simdi) continue;
                PendingIntent pi = niyet(c, adet, o);
                if (tam) am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, t, pi);
                else am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, t, pi);
                adet++;
            }
        } catch (Exception e) { }
        p.edit().putInt("adet", adet).apply();
        return adet;
    }

    // Genel hatırlatmalar: [{t, baslik, metin}]
    static int kurHatirlat(Context c) {
        SharedPreferences p = tercih(c);
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        int eski = p.getInt("hAdet", 0);
        for (int i = 0; i < eski; i++) { try { am.cancel(PendingIntent.getBroadcast(c, 8000 + i, new Intent(c, EzanReceiver.class).setAction("com.odicyazilim.nurrehberi.HATIRLAT." + i), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE)); } catch (Exception e) { } }
        int adet = 0;
        try {
            JSONArray a = new JSONArray(p.getString("hatirlat", "[]"));
            long simdi = System.currentTimeMillis();
            for (int i = 0; i < a.length() && adet < 100; i++) {
                JSONObject o = a.getJSONObject(i);
                long t = o.optLong("t", 0);
                if (t <= simdi) continue;
                Intent n = new Intent(c, EzanReceiver.class).setAction("com.odicyazilim.nurrehberi.HATIRLAT." + adet)
                    .putExtra("hatirlat", true).putExtra("baslik", o.optString("baslik", "Nur Rehberi")).putExtra("metin", o.optString("metin", "")).putExtra("t", t);
                PendingIntent pi = PendingIntent.getBroadcast(c, 8000 + adet, n, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
                am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, t, pi);
                adet++;
            }
        } catch (Exception e) { }
        p.edit().putInt("hAdet", adet).apply();
        return adet;
    }
}
`);
J("EzanReceiver",`import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

public class EzanReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context c, Intent i) {
        if (i.getBooleanExtra("hatirlat", false)) { hatirlat(c, i); return; }
        long t = i.getLongExtra("t", 0);
        if (t > 0 && System.currentTimeMillis() - t > 15 * 60 * 1000L) return; // çok gecikmiş vakit okunmaz
        Intent s = new Intent(c, EzanService.class).putExtras(i);
        try {
            if (Build.VERSION.SDK_INT >= 26) c.startForegroundService(s); else c.startService(s);
        } catch (Exception e) { }
    }

    static void hatirlat(Context c, Intent i) {
        try {
            android.app.NotificationManager nm = (android.app.NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
            if (Build.VERSION.SDK_INT >= 26 && nm.getNotificationChannel("hatirlat") == null)
                nm.createNotificationChannel(new android.app.NotificationChannel("hatirlat", "Hatırlatmalar", android.app.NotificationManager.IMPORTANCE_DEFAULT));
            Intent ac = c.getPackageManager().getLaunchIntentForPackage(c.getPackageName());
            android.app.PendingIntent pi = android.app.PendingIntent.getActivity(c, 7313, ac, android.app.PendingIntent.FLAG_UPDATE_CURRENT | android.app.PendingIntent.FLAG_IMMUTABLE);
            String metin = i.getStringExtra("metin");
            android.app.Notification n = new androidx.core.app.NotificationCompat.Builder(c, "hatirlat")
                .setSmallIcon(android.R.drawable.ic_popup_reminder)
                .setContentTitle(i.getStringExtra("baslik"))
                .setContentText(metin)
                .setStyle(new androidx.core.app.NotificationCompat.BigTextStyle().bigText(metin))
                .setContentIntent(pi).setAutoCancel(true).build();
            nm.notify((int) (i.getLongExtra("t", System.currentTimeMillis()) / 1000 % 100000) + 10000, n);
        } catch (Exception e) { }
    }
}
`);
J("EzanBoot",`import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public class EzanBoot extends BroadcastReceiver {
    @Override
    public void onReceive(Context c, Intent i) { EzanZaman.kur(c); EzanZaman.kurHatirlat(c); try { NurWidget.hepsiniGuncelle(c); } catch (Exception e) { } }
}
`);
J("EzanService",`import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.content.res.AssetFileDescriptor;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import android.os.VibrationEffect;
import android.os.Vibrator;
import androidx.core.app.NotificationCompat;

public class EzanService extends Service {
    static final String KANAL = "ezan_vakti";
    static final int NO = 7301;
    static final String DUR = "com.odicyazilim.nurrehberi.EZAN_DUR";
    static boolean caliyor = false;
    private MediaPlayer mp;
    private PowerManager.WakeLock kilit;

    static String dosya(String k) {
        switch (k) {
            case "imsak": return "sabah";
            case "ogle": case "ikindi": case "aksam": case "yatsi": case "sela": return k;
            default: return "ogle";
        }
    }

    static String vakitAdi(String k) {
        switch (k) {
            case "imsak": return "Sabah";
            case "ogle": return "Öğle";
            case "ikindi": return "İkindi";
            case "aksam": return "Akşam";
            case "yatsi": return "Yatsı";
            case "sela": return "Cuma Selâsı";
            default: return "Namaz";
        }
    }

    @Override
    public IBinder onBind(Intent i) { return null; }

    private void kanal() {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationManager nm = getSystemService(NotificationManager.class);
        if (nm.getNotificationChannel(KANAL) != null) return;
        NotificationChannel ch = new NotificationChannel(KANAL, "Ezan vakti", NotificationManager.IMPORTANCE_HIGH);
        ch.setDescription("Vakit girince ezan ve tam ekran hatırlatma");
        ch.setSound(null, null);
        ch.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
        nm.createNotificationChannel(ch);
    }

    @Override
    public int onStartCommand(Intent i, int f, int id) {
        if (i != null && DUR.equals(i.getAction())) { bitir(); return START_NOT_STICKY; }
        String k = i != null && i.getStringExtra("k") != null ? i.getStringExtra("k") : "ogle";
        String ad = i != null ? i.getStringExtra("ad") : null;
        if (ad == null || ad.isEmpty()) ad = vakitAdi(k) + (k.equals("sela") ? "" : " Ezanı");
        String saat = i != null && i.getStringExtra("saat") != null ? i.getStringExtra("saat") : "";
        String yer = i != null && i.getStringExtra("yer") != null ? i.getStringExtra("yer") : "";
        kanal();

        Intent ekran = new Intent(this, EzanActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                .putExtra("k", k).putExtra("saat", saat).putExtra("yer", yer);
        PendingIntent tamEkran = PendingIntent.getActivity(this, 7310, ekran, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        PendingIntent dur = PendingIntent.getService(this, 7311, new Intent(this, EzanService.class).setAction(DUR), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Notification n = new NotificationCompat.Builder(this, KANAL)
                .setSmallIcon(android.R.drawable.ic_popup_reminder)
                .setContentTitle(vakitAdi(k) + (k.equals("sela") ? "" : " vakti girdi"))
                .setContentText("Haydi namaza, haydi kurtuluşa. Elindeki işi bırak, namazını kıl.")
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setFullScreenIntent(tamEkran, true)
                .setContentIntent(tamEkran)
                .addAction(0, "Ezanı durdur", dur)
                .setOngoing(true)
                .build();
        if (Build.VERSION.SDK_INT >= 29) startForeground(NO, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
        else startForeground(NO, n);

        try {
            PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
            kilit = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "nur:ezan");
            kilit.acquire(6 * 60 * 1000L);
        } catch (Exception e) { }

        AudioManager am = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
        boolean sessiz = am != null && am.getRingerMode() != AudioManager.RINGER_MODE_NORMAL;
        titret();
        if (sessiz) { sonBildirim(k); return START_NOT_STICKY; } // telefon sessizde: ezan sesi yok, sadece ekran ve titreşim
        cal(k);
        return START_NOT_STICKY;
    }

    private void titret() {
        try {
            Vibrator v = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
            long[] d = { 0, 400, 200, 400 };
            if (Build.VERSION.SDK_INT >= 26) v.vibrate(VibrationEffect.createWaveform(d, -1)); else v.vibrate(d, -1);
        } catch (Exception e) { }
    }

    private void cal(String k) {
        sesKapat();
        try {
            float hacim = getSharedPreferences("ezan", MODE_PRIVATE).getFloat("ses", 1f);
            AssetFileDescriptor fd = getAssets().openFd("public/ses/" + dosya(k) + ".mp3");
            mp = new MediaPlayer();
            mp.setAudioAttributes(new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).setContentType(AudioAttributes.CONTENT_TYPE_MUSIC).build());
            mp.setDataSource(fd.getFileDescriptor(), fd.getStartOffset(), fd.getLength());
            fd.close();
            mp.setVolume(hacim, hacim);
            mp.setOnCompletionListener(x -> sonBildirim(k));
            mp.setOnErrorListener((x, a, b) -> { sonBildirim(k); return true; });
            mp.prepare();
            mp.start();
            caliyor = true;
        } catch (Exception e) { sonBildirim(k); }
    }

    private void sesKapat() {
        caliyor = false;
        if (mp != null) { try { mp.stop(); } catch (Exception e) { } try { mp.release(); } catch (Exception e) { } mp = null; }
    }

    static void sustur(Context c) {
        try { c.startService(new Intent(c, EzanService.class).setAction(DUR)); } catch (Exception e) { }
    }

    // ezan bitince kalıcı olmayan sade bir bildirim bırakır
    private void sonBildirim(String k) {
        sesKapat();
        try {
            Intent ac = getPackageManager().getLaunchIntentForPackage(getPackageName());
            PendingIntent pi = PendingIntent.getActivity(this, 7312, ac, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            Notification n = new NotificationCompat.Builder(this, KANAL)
                    .setSmallIcon(android.R.drawable.ic_popup_reminder)
                    .setContentTitle(vakitAdi(k) + (k.equals("sela") ? "" : " vakti girdi"))
                    .setContentText("Namazını kıldın mı? Allah kabul etsin.")
                    .setContentIntent(pi).setAutoCancel(true).setSilent(true).build();
            if (Build.VERSION.SDK_INT >= 24) stopForeground(STOP_FOREGROUND_REMOVE); else stopForeground(true);
            ((NotificationManager) getSystemService(NOTIFICATION_SERVICE)).notify(NO + 1, n);
        } catch (Exception e) { }
        serbest();
        stopSelf();
    }

    private void bitir() {
        sesKapat();
        try { if (Build.VERSION.SDK_INT >= 24) stopForeground(STOP_FOREGROUND_REMOVE); else stopForeground(true); } catch (Exception e) { }
        serbest();
        stopSelf();
    }

    private void serbest() { try { if (kilit != null && kilit.isHeld()) kilit.release(); } catch (Exception e) { } }

    @Override
    public void onDestroy() { sesKapat(); serbest(); super.onDestroy(); }
}
`);
J("EzanActivity",`import android.app.Activity;
import android.app.KeyguardManager;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

public class EzanActivity extends Activity {
    private WebView w;

    public class Kopru {
        @JavascriptInterface public void kapat() { runOnUiThread(() -> { EzanService.sustur(EzanActivity.this); finish(); }); }
        @JavascriptInterface public void sustur() { runOnUiThread(() -> EzanService.sustur(EzanActivity.this)); }
        @JavascriptInterface public void uygulama() {
            runOnUiThread(() -> {
                Intent i = getPackageManager().getLaunchIntentForPackage(getPackageName());
                if (i != null) startActivity(i);
                finish();
            });
        }
    }

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        if (Build.VERSION.SDK_INT >= 27) { setShowWhenLocked(true); setTurnScreenOn(true); }
        else getWindow().addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        w = new WebView(this);
        w.setBackgroundColor(0xFF0B1F3A);
        w.getSettings().setJavaScriptEnabled(true);
        w.addJavascriptInterface(new Kopru(), "Nur");
        setContentView(w);
        yukle(getIntent());
    }

    @Override
    protected void onNewIntent(Intent i) { super.onNewIntent(i); setIntent(i); yukle(i); }

    private void yukle(Intent i) {
        String k = i.getStringExtra("k"); if (k == null) k = "ogle";
        String saat = i.getStringExtra("saat"); if (saat == null) saat = "";
        String yer = i.getStringExtra("yer"); if (yer == null) yer = "";
        String sessiz = EzanService.caliyor ? "0" : "1";
        w.loadUrl("file:///android_asset/public/ezan-ekran.html?k=" + Uri.encode(k) + "&saat=" + Uri.encode(saat) + "&yer=" + Uri.encode(yer) + "&sessiz=" + sessiz);
    }

    // ses tuşlarına basınca ezan susar (alarm gibi)
    @Override
    public boolean onKeyDown(int kod, KeyEvent e) {
        if (kod == KeyEvent.KEYCODE_VOLUME_DOWN || kod == KeyEvent.KEYCODE_VOLUME_UP) {
            if (EzanService.caliyor) { EzanService.sustur(this); w.evaluateJavascript("document.getElementById('sus').classList.add('gizli')", null); return true; }
        }
        return super.onKeyDown(kod, e);
    }

    @Override
    protected void onDestroy() { if (w != null) w.destroy(); super.onDestroy(); }
}
`);
J("EzanPlugin",`import android.Manifest;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import androidx.core.app.ActivityCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "Ezan")
public class EzanPlugin extends Plugin {

    @PluginMethod
    public void planla(PluginCall call) {
        JSArray a = call.getArray("vakitler");
        Context c = getContext();
        android.content.SharedPreferences.Editor e = EzanZaman.tercih(c).edit();
        e.putString("liste", a != null ? a.toString() : "[]");
        Double ses = call.getDouble("ses");
        if (ses != null) e.putFloat("ses", ses.floatValue());
        e.commit();
        JSObject r = new JSObject();
        r.put("kurulan", EzanZaman.kur(c));
        r.put("tamAlarm", EzanZaman.tamAlarm(c));
        call.resolve(r);
    }

    @PluginMethod
    public void izinDurumu(PluginCall call) {
        Context c = getContext();
        JSObject r = new JSObject();
        r.put("bildirim", NotificationManagerCompat.from(c).areNotificationsEnabled());
        boolean tam = true;
        if (Build.VERSION.SDK_INT >= 34) tam = ((NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE)).canUseFullScreenIntent();
        r.put("tamEkran", tam);
        r.put("alarm", EzanZaman.tamAlarm(c));
        call.resolve(r);
    }

    @PluginMethod
    public void izinIste(PluginCall call) {
        if (Build.VERSION.SDK_INT >= 33 && ContextCompat.checkSelfPermission(getContext(), Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(getActivity(), new String[] { Manifest.permission.POST_NOTIFICATIONS }, 7320);
        }
        call.resolve();
    }

    @PluginMethod
    public void ayarAc(PluginCall call) {
        String tur = call.getString("tur", "bildirim");
        Context c = getContext();
        Intent i;
        if ("tamEkran".equals(tur) && Build.VERSION.SDK_INT >= 34) i = new Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT, Uri.parse("package:" + c.getPackageName()));
        else if ("alarm".equals(tur) && Build.VERSION.SDK_INT >= 31) i = new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, Uri.parse("package:" + c.getPackageName()));
        else if (Build.VERSION.SDK_INT >= 26) i = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, c.getPackageName());
        else i = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + c.getPackageName()));
        try { getActivity().startActivity(i); }
        catch (Exception e) { try { getActivity().startActivity(new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + c.getPackageName()))); } catch (Exception x) { } }
        call.resolve();
    }

    // Deneme: birkaç saniye sonra ezan çalar (ekranı kilitleyip denemek için)
    @PluginMethod
    public void test(PluginCall call) {
        int sn = call.getInt("saniye", 10);
        String k = call.getString("k", "ogle");
        try {
            org.json.JSONObject o = new org.json.JSONObject();
            o.put("k", k); o.put("t", System.currentTimeMillis() + sn * 1000L); o.put("saat", ""); o.put("yer", call.getString("yer", ""));
            android.app.AlarmManager am = (android.app.AlarmManager) getContext().getSystemService(Context.ALARM_SERVICE);
            android.app.PendingIntent pi = EzanZaman.niyet(getContext(), 399, o);
            if (EzanZaman.tamAlarm(getContext())) am.setExactAndAllowWhileIdle(android.app.AlarmManager.RTC_WAKEUP, o.getLong("t"), pi);
            else am.set(android.app.AlarmManager.RTC_WAKEUP, o.getLong("t"), pi);
        } catch (Exception e) { call.reject(e.getMessage()); return; }
        call.resolve();
    }

    @PluginMethod
    public void durdur(PluginCall call) { EzanService.sustur(getContext()); call.resolve(); }
}
`);
console.log("Ezan alarmı eklendi");

// ---- Ortak yerel eklenti (NurYerel): uygulama içi APK güncelleme, canlı yayın oynatıcı, paylaşma, kilit (parmak izi), widget, hatırlatma ----
const RS="android/app/src/main/res";["layout","xml","drawable"].forEach(d=>fs.mkdirSync(RS+"/"+d,{recursive:true}));
fs.writeFileSync(RS+"/xml/file_paths.xml",`<?xml version="1.0" encoding="utf-8"?>
<paths xmlns:android="http://schemas.android.com/apk/res/android">
    <external-path name="my_images" path="." />
    <cache-path name="my_cache_images" path="." />
    <files-path name="dosyalar" path="." />
</paths>
`);
fs.writeFileSync(RS+"/drawable/nur_widget_bg.xml",`<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
    <gradient android:startColor="#FF10231E" android:endColor="#FF1E4A3C" android:angle="270" />
    <corners android:radius="18dp" />
    <stroke android:width="1dp" android:color="#AAE8C77A" />
</shape>
`);
const vk=(id,ad)=>`        <LinearLayout android:layout_width="0dp" android:layout_height="wrap_content" android:layout_weight="1" android:orientation="vertical" android:gravity="center">
            <TextView android:id="@+id/w_${id}_ad" android:layout_width="wrap_content" android:layout_height="wrap_content" android:text="${ad}" android:textColor="#CCE8C77A" android:textSize="11sp" />
            <TextView android:id="@+id/w_${id}" android:layout_width="wrap_content" android:layout_height="wrap_content" android:text="--:--" android:textColor="#FFFDF7E8" android:textSize="13sp" android:textStyle="bold" />
        </LinearLayout>
`;
fs.writeFileSync(RS+"/layout/nur_widget.xml",`<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android" android:id="@+id/w_kok" android:layout_width="match_parent" android:layout_height="match_parent" android:orientation="vertical" android:padding="12dp" android:background="@drawable/nur_widget_bg">
    <LinearLayout android:layout_width="match_parent" android:layout_height="wrap_content" android:orientation="horizontal" android:gravity="center_vertical">
        <LinearLayout android:layout_width="0dp" android:layout_height="wrap_content" android:layout_weight="1" android:orientation="vertical">
            <TextView android:id="@+id/w_sonraki" android:layout_width="wrap_content" android:layout_height="wrap_content" android:text="Nur Rehberi" android:textColor="#FFFDF7E8" android:textSize="17sp" android:textStyle="bold" />
            <TextView android:id="@+id/w_yer" android:layout_width="wrap_content" android:layout_height="wrap_content" android:text="Uygulamayı bir kez aç" android:textColor="#B3FDF7E8" android:textSize="11sp" android:singleLine="true" />
        </LinearLayout>
        <Chronometer android:id="@+id/w_kalan" android:layout_width="wrap_content" android:layout_height="wrap_content" android:textColor="#FFE8C77A" android:textSize="20sp" android:textStyle="bold" />
    </LinearLayout>
    <LinearLayout android:layout_width="match_parent" android:layout_height="wrap_content" android:orientation="horizontal" android:layout_marginTop="10dp">
${vk("imsak","İmsak")}${vk("gunes","Güneş")}${vk("ogle","Öğle")}${vk("ikindi","İkindi")}${vk("aksam","Akşam")}${vk("yatsi","Yatsı")}    </LinearLayout>
</LinearLayout>
`);
fs.writeFileSync(RS+"/xml/nur_widget_info.xml",`<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android" android:minWidth="250dp" android:minHeight="100dp" android:targetCellWidth="4" android:targetCellHeight="2" android:updatePeriodMillis="1800000" android:initialLayout="@layout/nur_widget" android:resizeMode="horizontal|vertical" android:widgetCategory="home_screen" android:description="@string/app_name" />
`);
J("NurWidget",`import android.app.AlarmManager;
import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.os.SystemClock;
import android.widget.RemoteViews;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;
import org.json.JSONArray;
import org.json.JSONObject;

public class NurWidget extends AppWidgetProvider {
    static final String[] K = { "imsak", "gunes", "ogle", "ikindi", "aksam", "yatsi" };

    static void hepsiniGuncelle(Context c) {
        AppWidgetManager m = AppWidgetManager.getInstance(c);
        int[] ids = m.getAppWidgetIds(new ComponentName(c, NurWidget.class));
        if (ids != null && ids.length > 0) new NurWidget().onUpdate(c, m, ids);
    }

    static int kimlik(Context c, String ad) { return c.getResources().getIdentifier(ad, "id", c.getPackageName()); }

    @Override
    public void onUpdate(Context c, AppWidgetManager m, int[] ids) {
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.nur_widget);
        Intent ac = c.getPackageManager().getLaunchIntentForPackage(c.getPackageName());
        if (ac != null) v.setOnClickPendingIntent(R.id.w_kok, PendingIntent.getActivity(c, 7400, ac, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
        long sonraki = 0;
        try {
            android.content.SharedPreferences p = EzanZaman.tercih(c);
            JSONArray a = new JSONArray(p.getString("widget", "[]"));
            String tzAd = p.getString("widgetTz", "");
            TimeZone tz = tzAd.isEmpty() ? TimeZone.getDefault() : TimeZone.getTimeZone(tzAd);
            SimpleDateFormat sa = new SimpleDateFormat("HH:mm", Locale.US); sa.setTimeZone(tz);
            SimpleDateFormat gf = new SimpleDateFormat("yyyyMMdd", Locale.US); gf.setTimeZone(tz);
            long simdi = System.currentTimeMillis();
            String bugun = gf.format(new Date(simdi));
            JSONObject sOnr = null;
            for (int i = 0; i < a.length(); i++) {
                JSONObject o = a.getJSONObject(i);
                long t = o.getLong("t");
                if (gf.format(new Date(t)).equals(bugun)) {
                    int id = kimlik(c, "w_" + o.getString("k"));
                    if (id != 0) v.setTextViewText(id, sa.format(new Date(t)));
                }
                if (t > simdi && sOnr == null && !"gunes".equals(o.getString("k"))) sOnr = o;
            }
            for (String k : K) {
                int id = kimlik(c, "w_" + k), idA = kimlik(c, "w_" + k + "_ad");
                boolean bu = sOnr != null && k.equals(sOnr.getString("k")) && gf.format(new Date(sOnr.getLong("t"))).equals(bugun);
                if (id != 0) v.setTextColor(id, bu ? 0xFFE8C77A : 0xFFFDF7E8);
                if (idA != 0) v.setTextColor(idA, bu ? 0xFFE8C77A : 0xCCE8C77A);
            }
            v.setTextViewText(R.id.w_yer, p.getString("widgetYer", ""));
            if (sOnr != null) {
                sonraki = sOnr.getLong("t");
                v.setTextViewText(R.id.w_sonraki, EzanService.vakitAdi(sOnr.getString("k")) + " " + sa.format(new Date(sonraki)));
                v.setChronometer(R.id.w_kalan, SystemClock.elapsedRealtime() + (sonraki - simdi), null, true);
                if (android.os.Build.VERSION.SDK_INT >= 24) v.setChronometerCountDown(R.id.w_kalan, true);
            }
        } catch (Exception e) { }
        for (int id : ids) m.updateAppWidget(id, v);
        // bir sonraki vakit girince kendini yeniler
        try {
            long t = sonraki > 0 ? sonraki + 1000 : System.currentTimeMillis() + 30 * 60 * 1000L;
            Intent yen = new Intent(c, NurWidget.class).setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE).putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids);
            PendingIntent pi = PendingIntent.getBroadcast(c, 7401, yen, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            ((AlarmManager) c.getSystemService(Context.ALARM_SERVICE)).setAndAllowWhileIdle(AlarmManager.RTC, t, pi);
        } catch (Exception e) { }
    }
}
`);
J("CanliActivity",`import android.app.Activity;
import android.content.pm.ActivityInfo;
import android.graphics.Color;
import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;

// Canlı yayını uygulamanın içinde oynatır. YouTube gömülü oynatıcısı geçerli bir "Referer" ister;
// sayfayı https://com.odicyazilim.nurrehberi adresiyle yükleyerek bu sağlanır (Hata 153 çözümü).
public class CanliActivity extends Activity {
    private WebView w;
    private FrameLayout kok;
    private View tam;
    private WebChromeClient.CustomViewCallback cb;
    private String kanal = "";

    public class Kopru {
        @JavascriptInterface public void kapat() { runOnUiThread(() -> finish()); }
        @JavascriptInterface public void yanCevir() {
            runOnUiThread(() -> setRequestedOrientation(getRequestedOrientation() == ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE ? ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED : ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE));
        }
        @JavascriptInterface public void sayfa() { runOnUiThread(() -> w.loadUrl("https://m.youtube.com/channel/" + kanal + "/live")); }
    }

    private void gizle(boolean g) {
        View d = getWindow().getDecorView();
        d.setSystemUiVisibility(g ? (View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY) : 0);
    }

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        kanal = getIntent().getStringExtra("kanal"); if (kanal == null) kanal = "";
        String ad = getIntent().getStringExtra("ad"); if (ad == null) ad = "Canlı Yayın";
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        kok = new FrameLayout(this);
        kok.setBackgroundColor(Color.BLACK);
        w = new WebView(this);
        w.setBackgroundColor(Color.BLACK);
        WebSettings s = w.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        w.addJavascriptInterface(new Kopru(), "Nur");
        w.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
                String sc = r.getUrl().getScheme();
                return !("http".equals(sc) || "https".equals(sc)); // youtube:// ve intent:// dış uygulamaya atlamasın
            }
        });
        w.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onShowCustomView(View v, CustomViewCallback c) {
                if (tam != null) { c.onCustomViewHidden(); return; }
                tam = v; cb = c;
                kok.addView(v, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
                w.setVisibility(View.GONE);
                gizle(true);
                setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE);
            }
            @Override
            public void onHideCustomView() {
                if (tam == null) return;
                kok.removeView(tam); tam = null;
                w.setVisibility(View.VISIBLE);
                gizle(false);
                setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED);
                if (cb != null) cb.onCustomViewHidden();
                cb = null;
            }
        });
        kok.addView(w, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        setContentView(kok);
        String adH = ad.replace("&", "&amp;").replace("<", "&lt;");
        String k = kanal.replaceAll("[^A-Za-z0-9_-]", "");
        String html = "<!doctype html><html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'>"
            + "<style>*{box-sizing:border-box;margin:0}html,body{height:100%;background:#000;color:#fdf7e8;font-family:sans-serif}"
            + ".ust{display:flex;align-items:center;gap:12px;padding:14px 14px 10px}.x{width:40px;height:40px;border-radius:50%;border:0;background:#222;color:#fff;font-size:18px}"
            + ".ad{font-weight:700;font-size:16px}.cn{display:inline-block;background:#d9534f;color:#fff;font-size:11px;font-weight:700;padding:2px 7px;border-radius:4px;margin-top:3px}"
            + ".kap{position:relative;width:100%;padding-top:56.25%;background:#111}.kap iframe{position:absolute;inset:0;width:100%;height:100%;border:0}"
            + ".alt{display:flex;gap:10px;padding:14px;flex-wrap:wrap}.alt button{flex:1;min-width:140px;padding:12px;border-radius:10px;border:1px solid #e8c77a88;background:#151515;color:#fdf7e8;font-size:14px}"
            + "p{padding:0 14px;font-size:12.5px;color:#bbb;line-height:1.5}</style></head><body>"
            + "<div class='ust'><button class='x' onclick='Nur.kapat()'>✕</button><div><div class='ad'>" + adH + "</div><span class='cn'>● CANLI</span></div></div>"
            + "<div class='kap'><iframe src='https://www.youtube.com/embed/live_stream?channel=" + k + "&autoplay=1&playsinline=1&rel=0' allow='autoplay; encrypted-media; picture-in-picture; fullscreen' allowfullscreen referrerpolicy='strict-origin-when-cross-origin'></iframe></div>"
            + "<div class='alt'><button onclick='Nur.yanCevir()'>⟳ Yan çevir</button><button onclick='Nur.sayfa()'>Açılmadıysa: yayın sayfası</button></div>"
            + "<p>Yayın açılmazsa “Açılmadıysa: yayın sayfası” düğmesine dokun; yayın yine uygulamanın içinde açılır. Geri tuşu ile buraya dönebilirsin.</p></body></html>";
        w.loadDataWithBaseURL("https://com.odicyazilim.nurrehberi/", html, "text/html", "utf-8", null);
    }

    @Override
    public void onBackPressed() {
        if (tam != null) { w.getWebChromeClient().onHideCustomView(); return; }
        if (w.canGoBack()) { w.goBack(); return; }
        super.onBackPressed();
    }

    @Override
    protected void onDestroy() { if (w != null) { w.loadUrl("about:blank"); w.destroy(); } super.onDestroy(); }
}
`);
J("NurYerelPlugin",`import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.net.Uri;
import android.os.Build;
import android.os.CancellationSignal;
import android.provider.Settings;
import android.util.Base64;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import org.json.JSONArray;
import org.json.JSONObject;

@CapacitorPlugin(name = "NurYerel")
public class NurYerelPlugin extends Plugin {
    private volatile boolean indiriliyor = false;

    // Hangi yerel özelliklerin bu APK'da olduğunu bildirir (ileride JS buna göre davranır)
    @PluginMethod
    public void ozellikler(PluginCall call) {
        JSObject r = new JSObject();
        r.put("surum", 1);
        r.put("ozellikler", new JSArray(java.util.Arrays.asList("apk", "canli", "paylas", "kilit", "widget", "hatirlat", "ayar")));
        try { PackageInfo pi = getContext().getPackageManager().getPackageInfo(getContext().getPackageName(), 0); r.put("apkSurum", pi.versionName); } catch (Exception e) { }
        call.resolve(r);
    }

    // ---- Uygulama içinden APK güncelleme ----
    @PluginMethod
    public void apkIndir(PluginCall call) {
        String adres = call.getString("url");
        if (adres == null) { call.reject("adres yok"); return; }
        Context c = getContext();
        if (Build.VERSION.SDK_INT >= 26 && !c.getPackageManager().canRequestPackageInstalls()) {
            try { getActivity().startActivity(new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + c.getPackageName()))); } catch (Exception e) { }
            JSObject r = new JSObject(); r.put("durum", "izin"); call.resolve(r); return;
        }
        if (indiriliyor) { JSObject r = new JSObject(); r.put("durum", "suruyor"); call.resolve(r); return; }
        indiriliyor = true;
        new Thread(() -> {
            File d = new File(c.getCacheDir(), "guncelleme");
            d.mkdirs();
            File f = new File(d, "NurRehberi.apk");
            try {
                HttpURLConnection h = null;
                String u = adres;
                for (int i = 0; i < 6; i++) {
                    h = (HttpURLConnection) new URL(u).openConnection();
                    h.setInstanceFollowRedirects(false);
                    h.setConnectTimeout(20000); h.setReadTimeout(30000);
                    int kod = h.getResponseCode();
                    if (kod >= 300 && kod < 400) { u = new URL(new URL(u), h.getHeaderField("Location")).toString(); h.disconnect(); continue; }
                    if (kod != 200) throw new Exception("HTTP " + kod);
                    break;
                }
                long top = h.getContentLengthLong(), al = 0; int son = -1;
                try (InputStream in = h.getInputStream(); OutputStream out = new FileOutputStream(f)) {
                    byte[] b = new byte[65536]; int n;
                    while ((n = in.read(b)) > 0) {
                        out.write(b, 0, n); al += n;
                        int y = top > 0 ? (int) (al * 100 / top) : -1;
                        if (y != son) { son = y; JSObject e = new JSObject(); e.put("yuzde", y); notifyListeners("apkIlerleme", e); }
                    }
                }
                h.disconnect();
                Uri uri = FileProvider.getUriForFile(c, c.getPackageName() + ".fileprovider", f);
                Intent kur = new Intent(Intent.ACTION_VIEW).setDataAndType(uri, "application/vnd.android.package-archive")
                    .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
                getActivity().startActivity(kur);
                JSObject r = new JSObject(); r.put("durum", "kuruluyor"); call.resolve(r);
            } catch (Exception e) {
                call.reject("İndirilemedi: " + e.getMessage());
            } finally { indiriliyor = false; }
        }).start();
    }

    // ---- Canlı yayın (uygulama içi oynatıcı) ----
    @PluginMethod
    public void canli(PluginCall call) {
        Intent i = new Intent(getContext(), CanliActivity.class).putExtra("kanal", call.getString("kanal", "")).putExtra("ad", call.getString("ad", "Canlı Yayın"));
        getActivity().startActivity(i);
        call.resolve();
    }

    // ---- Dosya paylaşma (WhatsApp vb.) ----
    @PluginMethod
    public void paylas(PluginCall call) {
        try {
            String veri = call.getString("veri", ""), ad = call.getString("ad", "dosya"), tip = call.getString("tip", "*/*");
            ad = ad.replaceAll("[\\\\\\\\/:*?\\"<>|]", "");
            File d = new File(getContext().getCacheDir(), "paylas"); d.mkdirs();
            File f = new File(d, ad);
            try (OutputStream o = new FileOutputStream(f)) { o.write(Base64.decode(veri, Base64.DEFAULT)); }
            Uri uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", f);
            Intent s = new Intent(Intent.ACTION_SEND).setType(tip).putExtra(Intent.EXTRA_STREAM, uri).addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            String metin = call.getString("metin");
            if (metin != null) s.putExtra(Intent.EXTRA_TEXT, metin);
            getActivity().startActivity(Intent.createChooser(s, call.getString("baslik", "Paylaş")));
            call.resolve();
        } catch (Exception e) { call.reject(e.getMessage()); }
    }

    // ---- Uygulama kilidi: parmak izi / yüz / ekran kilidi ----
    @PluginMethod
    public void kimlik(PluginCall call) {
        if (Build.VERSION.SDK_INT < 28) { JSObject r = new JSObject(); r.put("ok", true); r.put("destek", false); call.resolve(r); return; }
        getActivity().runOnUiThread(() -> {
            try {
                android.hardware.biometrics.BiometricPrompt.Builder b = new android.hardware.biometrics.BiometricPrompt.Builder(getContext())
                    .setTitle(call.getString("baslik", "Nur Rehberi"))
                    .setSubtitle(call.getString("altBaslik", "Devam etmek için kimliğini doğrula"));
                if (Build.VERSION.SDK_INT >= 30) b.setAllowedAuthenticators(android.hardware.biometrics.BiometricManager.Authenticators.BIOMETRIC_WEAK | android.hardware.biometrics.BiometricManager.Authenticators.DEVICE_CREDENTIAL);
                else b.setDeviceCredentialAllowed(true);
                b.build().authenticate(new CancellationSignal(), getContext().getMainExecutor(), new android.hardware.biometrics.BiometricPrompt.AuthenticationCallback() {
                    @Override public void onAuthenticationSucceeded(android.hardware.biometrics.BiometricPrompt.AuthenticationResult s) { JSObject r = new JSObject(); r.put("ok", true); r.put("destek", true); call.resolve(r); }
                    @Override public void onAuthenticationError(int kod, CharSequence m) { JSObject r = new JSObject(); r.put("ok", false); r.put("destek", true); r.put("hata", String.valueOf(m)); call.resolve(r); }
                });
            } catch (Exception e) { JSObject r = new JSObject(); r.put("ok", false); r.put("destek", false); r.put("hata", e.getMessage()); call.resolve(r); }
        });
    }

    // ---- Ana ekran widget'ı ----
    @PluginMethod
    public void widget(PluginCall call) {
        JSArray a = call.getArray("vakitler");
        EzanZaman.tercih(getContext()).edit()
            .putString("widget", a != null ? a.toString() : "[]")
            .putString("widgetYer", call.getString("yer", ""))
            .putString("widgetTz", call.getString("tz", ""))
            .commit();
        NurWidget.hepsiniGuncelle(getContext());
        call.resolve();
    }

    // ---- Genel hatırlatma bildirimleri (Cuma, kandil, hatim, günün ayeti vb.) ----
    @PluginMethod
    public void hatirlat(PluginCall call) {
        JSArray a = call.getArray("liste");
        EzanZaman.tercih(getContext()).edit().putString("hatirlat", a != null ? a.toString() : "[]").commit();
        JSObject r = new JSObject(); r.put("kurulan", EzanZaman.kurHatirlat(getContext())); call.resolve(r);
    }

    // ---- Genel anahtar-değer (ileride yerel taraf okuyabilsin) ----
    @PluginMethod
    public void ayarYaz(PluginCall call) {
        EzanZaman.tercih(getContext()).edit().putString("a_" + call.getString("anahtar", "x"), call.getString("deger", "")).apply();
        call.resolve();
    }
}
`);
console.log("NurYerel eklentisi eklendi");
