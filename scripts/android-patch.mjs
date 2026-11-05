// "npx cap add android" sonrası: izinler, sürüm numarası
import fs from "fs";
const v=JSON.parse(fs.readFileSync("apk.json","utf8")); // yerel uygulama (APK) sürümü
const mf="android/app/src/main/AndroidManifest.xml";let m=fs.readFileSync(mf,"utf8");
const izin=["android.permission.INTERNET","android.permission.RECORD_AUDIO","android.permission.MODIFY_AUDIO_SETTINGS","android.permission.ACCESS_COARSE_LOCATION","android.permission.ACCESS_FINE_LOCATION","android.permission.VIBRATE","android.permission.POST_NOTIFICATIONS","android.permission.USE_EXACT_ALARM","android.permission.USE_FULL_SCREEN_INTENT","android.permission.WAKE_LOCK","android.permission.FOREGROUND_SERVICE","android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK","android.permission.RECEIVE_BOOT_COMPLETED"];
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
}
`);
J("EzanReceiver",`import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

public class EzanReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context c, Intent i) {
        long t = i.getLongExtra("t", 0);
        if (t > 0 && System.currentTimeMillis() - t > 15 * 60 * 1000L) return; // çok gecikmiş vakit okunmaz
        Intent s = new Intent(c, EzanService.class).putExtras(i);
        try {
            if (Build.VERSION.SDK_INT >= 26) c.startForegroundService(s); else c.startService(s);
        } catch (Exception e) { }
    }
}
`);
J("EzanBoot",`import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public class EzanBoot extends BroadcastReceiver {
    @Override
    public void onReceive(Context c, Intent i) { EzanZaman.kur(c); }
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
