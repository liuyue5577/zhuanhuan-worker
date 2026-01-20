import { createApp } from './app/createApp.jsx';
import { createCloudflareRuntime } from './runtime/cloudflare.js';

let honoApp;

function getApp(env) {
    if (!honoApp) {
        const runtime = createCloudflareRuntime(env);
        honoApp = createApp(runtime);
    }
    return honoApp;
}

export default {
    async fetch(request, env, ctx) {
        // --- 🛡️ 智能安保系统 (全客户端白名单版) ---
        const secretToken = env.TOKEN || env.PASSWORD;
        const url = new URL(request.url);
        const userToken = url.searchParams.get("token");

        // 1. 获取客户端“名字” (User-Agent)
        const userAgent = request.headers.get("User-Agent") || "";
        
        // 2. 定义 VIP 客户端列表 (包含 PC 端的 v2rayN)
        // 解释：
        // Clash -> 涵盖 OpenClash, Clash Verge, ClashX 等
        // v2rayN -> 涵盖 Windows 版 v2rayN
        // v2rayNG -> 涵盖 Android 版
        // Go-http-client -> 涵盖所有基于 Go 内核的客户端
        const isVipClient = /(Clash|Shadowrocket|Quantumult|Stash|Go-http-client|v2rayN|v2rayNG|Karing|NekoBox|Sing-Box|Hiddify|Surge|Loon)/i.test(userAgent);

        // 3. Cookie 检查 (给浏览器用的)
        const cookieHeader = request.headers.get("Cookie") || "";
        const hasCookieToken = cookieHeader.includes(`auth_token=${secretToken}`);

        // 4. 拦截判断
        // 规则：(有密码) 且 (不是VIP软件) 且 (没带密码) 且 (浏览器没Cookie) 且 (不是静态资源)
        if (secretToken && !isVipClient && userToken !== secretToken && !hasCookieToken && !url.pathname.startsWith("/assets")) {
            
            return new Response(`
            <!DOCTYPE html>
            <html lang="zh-CN">
            <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>🔒 私有服务</title>
            <style>body{font-family:system-ui,-apple-system,sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;background:#f0f2f5}.card{background:white;padding:2rem;border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,0.1);text-align:center;width:300px}input{width:100%;padding:10px;margin:10px 0;border:1px solid #ddd;border-radius:6px}button{width:100%;padding:10px;background:#0070f3;color:white;border:none;border-radius:6px;cursor:pointer}</style></head>
            <body><div class="card"><h3>🔒 访问受限</h3><p>请输入密码以继续</p><input type="password" id="pass" onkeydown="if(event.key==='Enter')sub()"><button onclick="sub()">验证</button></div>
            <script>function sub(){var p=document.getElementById('pass').value;if(p){var d=new Date();d.setTime(d.getTime()+(30*864e5));document.cookie="auth_token="+p+"; expires="+d.toUTCString()+"; path=/";location.reload();}}</script>
            </body></html>`, { 
                status: 200, 
                headers: { "Content-Type": "text/html;charset=UTF-8" } 
            });
        }

        const app = getApp(env);
        return app.fetch(request, env, ctx);
    }
};
