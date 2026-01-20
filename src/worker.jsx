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
        // --- 🛡️ 智能安保系统 (短链自动授权版) ---
        const secretToken = env.TOKEN || env.PASSWORD;
        const url = new URL(request.url);
        const userToken = url.searchParams.get("token");

        // 1. Cookie 检查 (网页访问免密)
        const cookieHeader = request.headers.get("Cookie") || "";
        const hasCookieToken = cookieHeader.includes(`auth_token=${secretToken}`);

        // 2. 拦截判断
        // 规则：(有密码设置) 且 (URL没带密码) 且 (Cookie没密码) 且 (不是静态资源) 且 (不是短链接) -> 拦截
        // 👇 关键点：!url.pathname.startsWith("/s/") 表示如果是短链接，直接放行，不弹密码框
        if (secretToken && userToken !== secretToken && !hasCookieToken && 
            !url.pathname.startsWith("/assets") && 
            !url.pathname.startsWith("/s/")) {
            
            return new Response(`
            <!DOCTYPE html>
            <html lang="zh-CN">
            <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>🔒 访问受限</title>
            <style>body{font-family:system-ui,-apple-system,sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;background:#f0f2f5}.card{background:white;padding:2rem;border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,0.1);text-align:center;width:300px}input{width:100%;padding:10px;margin:10px 0;border:1px solid #ddd;border-radius:6px}button{width:100%;padding:10px;background:#0070f3;color:white;border:none;border-radius:6px;cursor:pointer}</style></head>
            <body><div class="card"><h3>🔒 私有服务</h3><p>请输入密码</p><input type="password" id="pass" onkeydown="if(event.key==='Enter')sub()"><button onclick="sub()">进入</button></div>
            <script>function sub(){var p=document.getElementById('pass').value;if(p){var d=new Date();d.setTime(d.getTime()+(30*864e5));document.cookie="auth_token="+p+"; expires="+d.toUTCString()+"; path=/";location.reload();}}</script>
            </body></html>`, { status: 200, headers: { "Content-Type": "text/html;charset=UTF-8" } });
        }

        const app = getApp(env);
        // 执行原始请求
        let response = await app.fetch(request, env, ctx);

        // --- 🔀 自动注入密码 (Magic!) ---
        // 如果系统要跳转 (302) 且 (是短链接访问 OR 用户带了密码)
        if (secretToken && (response.status === 302 || response.status === 301)) {
            // 👇 只要是短链接访问，系统就自动帮你把密码加上去！
            if (url.pathname.startsWith("/s/") || userToken === secretToken) {
                const location = response.headers.get("Location");
                if (location) {
                    try {
                        const newLocationUrl = new URL(location, request.url);
                        // 强制注入 Token，让 OpenClash 的下一步请求能通过
                        newLocationUrl.searchParams.set("token", secretToken);
                        
                        response = new Response(response.body, response);
                        response.headers.set("Location", newLocationUrl.toString());
                        return response;
                    } catch (e) {}
                }
            }
        }
        // --- 🔀 结束 ---

        return response;
    }
};
