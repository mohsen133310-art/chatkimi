package com.kimi.chat

import android.annotation.SuppressLint
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView

private val Violet = Color(0xFF7655D9)
private val Pale = Color(0xFFF5F1FF)
private val Ink = Color(0xFF30264A)

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { KimiNativeApp() }
    }
}

@Composable
private fun KimiNativeApp() {
    var tab by remember { mutableStateOf("چت‌ها") }
    MaterialTheme(colorScheme = lightColorScheme(primary = Violet, secondary = Color(0xFF9A7CEB), background = Color(0xFFFAF9FD), surface = Color.White, onBackground = Ink, onSurface = Ink)) {
        Scaffold(
            containerColor = Color(0xFFFAF9FD),
            topBar = {
                Row(Modifier.fillMaxWidth().background(Color.White).padding(horizontal = 20.dp, vertical = 16.dp), verticalAlignment = Alignment.CenterVertically) {
                    Box(Modifier.size(42.dp).background(Violet, RoundedCornerShape(14.dp)), Alignment.Center) { Text("K", color = Color.White, fontWeight = FontWeight.Black) }
                    Spacer(Modifier.width(12.dp))
                    Column(Modifier.weight(1f)) {
                        Text("Kimi", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                        Text("با هم در ارتباط بمانیم", color = Color.Gray, style = MaterialTheme.typography.labelSmall)
                    }
                    IconButton(onClick = { tab = "پروفایل" }) { Icon(Icons.Default.AccountCircle, null, tint = Violet) }
                }
            },
            bottomBar = {
                NavigationBar(containerColor = Color.White) {
                    listOf("چت‌ها", "مخاطبین", "مرورگر", "پروفایل").forEach { item ->
                        val icon = when (item) { "چت‌ها" -> Icons.Default.Chat; "مخاطبین" -> Icons.Default.People; "مرورگر" -> Icons.Default.Language; else -> Icons.Default.Person }
                        NavigationBarItem(selected = tab == item, onClick = { tab = item }, icon = { Icon(icon, contentDescription = item) }, label = { Text(item) })
                    }
                }
            }
        ) { padding ->
            when (tab) {
                "مرورگر" -> NativeBrowser(Modifier.padding(padding))
                "مخاطبین" -> InfoPage("مخاطبین", "جست‌وجوی کاربران و افزودن مخاطب در مرحله اتصال حساب Kimi تکمیل می‌شود.", Modifier.padding(padding))
                "پروفایل" -> InfoPage("حساب Kimi", "پروفایل، امنیت حساب و تنظیمات نسخه بومی Kimi.", Modifier.padding(padding))
                else -> ChatHome(Modifier.padding(padding))
            }
        }
    }
}

@Composable
private fun ChatHome(modifier: Modifier = Modifier) {
    val samples = listOf("گفتگوی Kimi" to "به Kimi خوش آمدی!", "گروه دوستان" to "آخر هفته برنامه داریم؟", "اعلان‌ها" to "نسخه بومی Kimi آماده توسعه است")
    Column(modifier.fillMaxSize().padding(18.dp)) {
        Text("پیام‌ها", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
        Spacer(Modifier.height(14.dp))
        OutlinedTextField(value = "", onValueChange = {}, readOnly = true, placeholder = { Text("جست‌وجوی گفتگوها") }, leadingIcon = { Icon(Icons.Default.Search, null) }, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(16.dp))
        Spacer(Modifier.height(14.dp))
        LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            items(samples) { (name, preview) ->
                Row(Modifier.fillMaxWidth().background(Color.White, RoundedCornerShape(18.dp)).clickable {}.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                    Box(Modifier.size(48.dp).background(Pale, CircleShape), Alignment.Center) { Text(name.take(1), color = Violet, fontWeight = FontWeight.Bold) }
                    Spacer(Modifier.width(12.dp))
                    Column(Modifier.weight(1f)) { Text(name, fontWeight = FontWeight.SemiBold); Text(preview, color = Color.Gray, style = MaterialTheme.typography.bodySmall) }
                    Text("امروز", color = Color.Gray, style = MaterialTheme.typography.labelSmall)
                }
            }
        }
        Spacer(Modifier.height(18.dp))
        Text("این پوستهٔ بومی Kotlin/Compose است؛ اتصال پیام‌رسانی واقعی و ورود Supabase هنوز باید پیاده‌سازی شود.", color = Color.Gray, style = MaterialTheme.typography.bodySmall)
    }
}

@Composable
private fun InfoPage(title: String, body: String, modifier: Modifier = Modifier) {
    Column(modifier.fillMaxSize().padding(22.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text(title, style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
        Text(body, color = Color.Gray)
    }
}

@SuppressLint("SetJavaScriptEnabled")
@Composable
private fun NativeBrowser(modifier: Modifier = Modifier) {
    val context = LocalContext.current
    var address by remember { mutableStateOf("https://www.google.com") }
    var current by remember { mutableStateOf("https://www.google.com") }
    var webView by remember { mutableStateOf<WebView?>(null) }
    BackHandler(enabled = webView?.canGoBack() == true) { webView?.goBack() }
    Column(modifier.fillMaxSize().background(Color.White)) {
        Row(Modifier.fillMaxWidth().padding(10.dp), verticalAlignment = Alignment.CenterVertically) {
            OutlinedTextField(value = address, onValueChange = { address = it }, modifier = Modifier.weight(1f), singleLine = true, placeholder = { Text("نشانی سایت یا جست‌وجو") }, shape = RoundedCornerShape(14.dp))
            IconButton(onClick = {
                val target = if (address.startsWith("http://") || address.startsWith("https://")) address else "https://www.google.com/search?q=" + Uri.encode(address)
                current = target
                webView?.loadUrl(target)
            }) { Icon(Icons.Default.ArrowForward, "برو", tint = Violet) }
        }
        Row(Modifier.fillMaxWidth().padding(horizontal = 12.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            TextButton(onClick = { webView?.goBack() }) { Icon(Icons.Default.ArrowBack, null); Text("قبلی") }
            TextButton(onClick = { webView?.goForward() }) { Icon(Icons.Default.ArrowForward, null); Text("بعدی") }
            TextButton(onClick = { webView?.reload() }) { Icon(Icons.Default.Refresh, null); Text("تازه‌سازی") }
            TextButton(onClick = { runCatching { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(current))) } }) { Icon(Icons.Default.OpenInBrowser, null); Text("خارجی") }
        }
        AndroidView(modifier = Modifier.fillMaxSize(), factory = { ctx ->
            WebView(ctx).apply {
                settings.javaScriptEnabled = true
                settings.domStorageEnabled = true
                settings.setSupportZoom(true)
                webViewClient = object : WebViewClient() {
                    override fun onPageFinished(view: WebView, url: String) { address = url; current = url }
                }
                webChromeClient = WebChromeClient()
                loadUrl(current)
                webView = this
            }
        }, update = { webView = it })
    }
}
