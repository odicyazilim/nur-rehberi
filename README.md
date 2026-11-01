# Nur Rehberi

Ezan vakitleri, Kur'an-ı Kerim, dualar, hadisler ve İslami bilgiler.

- **Android:** `Releases` sayfasındaki `NurRehberi.apk`
- **iPhone ve web:** https://odicyazilim.github.io/nur-rehberi/ (Safari > Paylaş > Ana Ekrana Ekle)

## Klasörler
| Klasör / dosya | Ne işe yarar |
|---|---|
| `app/index.html` | Uygulamanın kendisi |
| `app/kuran.js`, `app/hadis/` | Kur'an ve hadis verileri |
| `src/` | Yazı tipleri, simgeler, iPhone web uygulaması dosyaları |
| `version.json` | Sürüm bilgisi. Telefonlar yeni sürümü buradan öğrenir |
| `icerik.json` | APK güncellemeden telefonlara gönderilen içerik (fitre miktarı, yeni hikâye, soru, duyuru) |

## Yeni sürüm nasıl yayınlanır?
1. `app/` içindeki dosyaları güncelle.
2. `version.json` içinde `kod` değerini 1 artır (1 → 2) ve `surum` değerini değiştir (1.0.0 → 1.1.0). `notlar` alanına yenilikleri yaz.
3. Değişiklikleri `main` dalına gönder.
4. GitHub APK'yı kendisi derler ve `Releases` sayfasında yayınlar. iPhone/web sürümü de kendiliğinden güncellenir.
5. Android'deki uygulamalar açıldığında "Yeni sürüm hazır" bildirimi gösterir.

## APK güncellemeden içerik göndermek
`icerik.json` dosyasını düzenleyip `main` dalına göndermek yeterlidir:
- `diyanet`: ör. `{"fitre": 260, "fidyeGun": 260, "donem": "2027 Ramazanı – 2028 Ramazanı"}`
- `fitreYil`: ör. `{"2027": 260}`
- `hikaye`, `soru`, `sss`: uygulamadaki biçimde yeni kayıtlar

Duyuru için `version.json` içinde: `"duyuru": {"id": "ramazan-2027", "metin": "Ramazan-ı şerifiniz mübarek olsun."}`

## İmza anahtarı (çok önemli)
APK, depo ayarlarındaki 4 secret ile imzalanır: `KEYSTORE_BASE64`, `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD`.
İmza dosyası kaybolursa telefonlardaki uygulama bir daha güncellenemez. Yedeğini güvenli bir yerde sakla; bu depoya asla koyma.
