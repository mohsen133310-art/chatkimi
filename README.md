# Kimi — پیام‌رسان

نسخه آغازین پیام‌رسان Kimi با React، TypeScript و Supabase.

## امکانات این نسخه
- ثبت‌نام و ورود با ایمیل و رمز عبور
- پروفایل و نام کاربری
- گفت‌وگوی خصوصی با نام کاربری
- پیام متنی زنده
- ارسال تصویر و فایل تا ۲۰ مگابایت
- طراحی واکنش‌گرا برای موبایل و دسکتاپ
- تنظیمات پایه Capacitor برای اندروید

## اجرای محلی
```bash
npm install
npm run dev
```

## انتشار وب
در مخزن GitHub به Settings → Pages برو و Source را روی GitHub Actions قرار بده. workflow با هر push به main سایت را منتشر می‌کند.

نشانی: https://mohsen133310-art.github.io/chatkimi/

## اندروید
```bash
npx cap add android
npm run build
npx cap sync android
npx cap open android
```
ساخت APK به Android Studio و Android SDK نیاز دارد.

## زیرساخت
Supabase Auth، Postgres، Realtime و Storage. کلید داخل فرانت‌اند فقط publishable key است؛ هرگز service_role یا secret key را در مرورگر قرار نده.
