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
        // --- 🛡️ 智能安保系统 (全格式兼容版) ---
        const secretToken = env.TOKEN || env.PASSWORD;
        const url = new URL(request.url);
        const userToken = url.searchParams.get("token");
        const userAgent = request.headers.get("User-Agent") || "";

        // 1. 识别 VIP 客户端 (作为双重保险)
        const isVipClient = /(Clash|Shadowrocket|Quantumult|Stash|Go-http-client|v2rayN|v2rayNG|Karing|NekoBox|Sing-Box|Hiddify|Surge|Loon|Mihomo|Metacubex)/i.test(userAgent);

        // 2. 识别短链接格式 (关键修复！) 
        // 允许 /s/ (Surge), /c/ (Clash), /x/ (Xray), /b/ (SingBox) 开头的路径直接通过
        const isShortLink = /^\/(s|c|x|b)\//.test(url.pathname);

        // 3. Cookie 检查
        const cookieHeader = request.headers.get("Cookie") || "";
        const hasCookieToken = cookieHeader.includes(`auth_token=${secretToken}`);

        // 4. 拦截判断
        // 如果 (有密码) 且 (没带Token) 且 (不是VIP软件) 且 (没Cookie) 且 (不是静态资源) 且 (不是短链接) -> 拦截
        if (secretToken && 
            userToken !== secretToken && 
            !isVipClient && 
            !hasCookieToken && 
            !url.pathname.startsWith("/assets") && 
            !isShortLink) { // 👈 这里放行了所有短链接
            
            return new Response(`
            <!DOCTYPE html>
            <html lang="zh-CN">
            <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>🔒 私有服务</title>
            <style>body{font-family:system-ui,-apple-system,sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;background:#f0f2f5}.card{background:white;padding:2rem;border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,0.1);text-align:center;width:300px}input{width:100%;padding:10px;margin:10px 0;border:1px solid #ddd;border-radius:6px}button{width:100%;padding:10px;background:#0070f3;color:white;border:none;border-radius:6px;cursor:pointer}</style></head>
            <body><div class="card"><h3>🔒 访问受限</h3><p>请输入密码以继续</p><input type="password" id="pass" onkeydown="if(event.key==='Enter')sub()"><button onclick="sub()">验证</button></div>
            <script>function sub(){var p=document.getElementById('pass').value;if(p){var d=new Date();d.setTime(d.getTime()+(30*864e5));document.cookie="auth_token="+p+"; expires="+d.toUTCString()+"; path=/";location.reload();}}</script>
            </body></html>`, { status: 200, headers: { "Content-Type": "text/html;charset=UTF-8" } });
        }

        const app = getApp(env);
        let response = await app.fetch(request, env, ctx);

        // --- 🔀 自动注入密码 (支持所有短链跳转) ---
        // 只要是跳转状态，并且来源是短链接，就自动把密码贴到下一站
        if (secretToken && (response.status >= 300 && response.status < 400)) {
            if (isShortLink || userToken === secretToken) {
                const location = response.headers.get("Location");
                if (location) {
                    try {
                        const newLocationUrl = new URL(location, request.url);
                        newLocationUrl.searchParams.set("token", secretToken); // 💉 注入密码
                        
                        response = new Response(response.body, response);
                        response.headers.set("Location", newLocationUrl.toString());
                        return response;
                    } catch (e) {}
                }
            }
        }

        return response;
    }
};
