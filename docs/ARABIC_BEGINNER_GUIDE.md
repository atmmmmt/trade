# دليل تشغيل المشروع للمبتدئين

هذا الدليل مخصص إذا ما عندك خبرة بتشغيل مشاريع Node.js.

## أولاً: شو لازم يكون عندك على الجهاز؟

1. Node.js LTS
2. Git
3. VS Code اختياري لكنه مفيد

## ثانياً: تنزيل المشروع

افتح CMD أو PowerShell واكتب:

```bash
git clone https://github.com/atmmmmt/trade.git
cd trade
```

إذا ما بدك تستخدم Git، فيك تدخل على GitHub وتضغط:

Code → Download ZIP

بعدها فك الضغط وافتح المجلد.

## ثالثاً: تشغيل الباك إند API بأسهل طريقة على ويندوز

افتح ملف:

```txt
RUN_API_WINDOWS.bat
```

هذا الملف يعمل التالي تلقائياً:

- ينشئ ملف `.env` إذا غير موجود.
- يثبت الحزم إذا `node_modules` غير موجود.
- يشغل API على `http://localhost:5000`.

بعد التشغيل افتح المتصفح وجرب:

```txt
http://localhost:5000/health
```

إذا ظهر `ok: true` فالباك إند شغال.

## رابعاً: تشغيل الداشبورد

افتح نافذة ثانية، ثم افتح ملف:

```txt
RUN_DASHBOARD_WINDOWS.bat
```

بعدها افتح:

```txt
http://localhost:5173
```

## خامساً: شو البيانات المطلوبة للتجربة؟

### 1. تحليل السوق فقط

لا تحتاج أي API Key.

النظام يقرأ الأسعار والشموع العامة من Binance Futures Testnet public endpoints.

جرب:

```txt
http://localhost:5000/api/bot/signal?symbol=BTCUSDT&interval=1m
```

### 2. Paper Mode

لا تحتاج أي API Key.

هذا مجرد حساب وهمي يبدأ من 1000 دولار تجريبي.

من الداشبورد اضغط:

```txt
Paper Tick
```

أو من API:

```txt
http://localhost:5000/api/lab/paper/account
```

### 3. Backtest

لا تحتاج أي API Key.

جرب:

```txt
http://localhost:5000/api/lab/backtest?symbol=BTCUSDT&interval=1m&limit=500&startingBalance=1000&riskPercent=1
```

### 4. Binance Sandbox/Testnet status

هنا تحتاج مفاتيح Testnet فقط، وليس حساب حقيقي.

داخل ملف `.env` ضع:

```env
BINANCE_API_KEY=ضع_المفتاح_هنا
BINANCE_API_SECRET=ضع_السيكريت_هنا
```

ثم جرب:

```txt
http://localhost:5000/api/sandbox/status
```

لا تضع المفاتيح داخل GitHub. لا ترسل السيكريت لأي شخص.

## سادساً: من وين أجيب Binance Testnet API؟

ادخل على Binance Futures Demo / Testnet من حسابك، ثم أنشئ API Key خاص بالتجربة فقط.

القواعد المهمة:

- لا تستخدم مفاتيح الحساب الحقيقي.
- لا تفعل السحب Withdraw أبداً.
- إذا المفتاح انكشف، احذفه فوراً وأنشئ غيره.
- الأفضل لاحقاً تعمل IP whitelist لسيرفرك.

## سابعاً: ترتيب التجربة الصحيح

1. شغل API.
2. شغل Dashboard.
3. اضغط Run Signal.
4. اضغط Run Backtest.
5. اضغط Paper Tick لمدة كم يوم وشوف النتائج.
6. بعدين فقط أضف Testnet keys.
7. لا تنتقل لحقيقي إلا بعد تجارب كثيرة جداً.

## ثامناً: معنى الأزرار في الداشبورد

- Run Signal: يعطيك BUY / SELL / WAIT مع الأسباب.
- Run Backtest: يجرب الاستراتيجية على بيانات سابقة.
- Paper Tick: يحاكي صفقة وهمية إذا ظهرت إشارة.
- Reset Paper: يرجع الحساب الوهمي من البداية.

## تاسعاً: إذا ظهر خطأ

صور الخطأ أو انسخ النص وأرسله.

أهم أخطاء ممكنة:

- `node is not recognized`: Node.js غير مثبت.
- `git is not recognized`: Git غير مثبت.
- `port 5000 already in use`: في برنامج ثاني يستخدم نفس البورت.
- `Sandbox API credentials are missing`: لم تضف مفاتيح Testnet داخل `.env`.
