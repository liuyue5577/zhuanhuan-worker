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
        // --- 🛡️ 核心配置区域 ---
        const secretToken = env.TOKEN || env.PASSWORD;
        const url = new URL(request.url);
        const userToken = url.searchParams.get("token");
        const userAgent = request.headers.get("User-Agent") || "";

        // 1. 识别 VIP 客户端 (Clash/v2ray/小火箭等直接放行)
        const isVipClient = /(Clash|Shadowrocket|Quantumult|Stash|Go-http-client|v2rayN|v2rayNG|Karing|NekoBox|Sing-Box|Hiddify|Surge|Loon|Mihomo|Metacubex)/i.test(userAgent);

        // 2. 识别短链接格式 (允许 /s/ /c/ /x/ /b/ 开头的路径)
        const isShortLink = /^\/(s|c|x|b)\//.test(url.pathname);

        // 3. Cookie 检查
        const cookieHeader = request.headers.get("Cookie") || "";
        const hasCookieToken = cookieHeader.includes(`auth_token=${secretToken}`);

        // --- 🔒 拦截逻辑 ---
        if (secretToken && 
            userToken !== secretToken && 
            !isVipClient && 
            !hasCookieToken && 
            !url.pathname.startsWith("/assets") && 
            !isShortLink) {
            
            // 👇 这里才是带小眼睛开关的升级版页面
            return new Response(`
            <!DOCTYPE html>
            <html lang="zh-CN">
            <head>
            <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>🔒 私有服务</title>
            <style>
                body{font-family:system-ui,-apple-system,sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;background:#f0f2f5}
                .card{background:white;padding:2rem;border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,0.1);text-align:center;width:300px}
                .input-group{position:relative;margin:15px 0}
                input{width:100%;padding:12px;border:1px solid #ddd;border-radius:6px;box-sizing:border-box;font-size:16px}
                /* 小眼睛的样式 */
                .eye-icon{position:absolute;right:10px;top:50%;transform:translateY(-50%);cursor:pointer;opacity:0.6;user-select:none}
                .eye-icon:hover{opacity:1}
                button{width:100%;padding:12px;background:#0070f3;color:white;border:none;border-radius:6px;cursor:pointer;font-size:16px;font-weight:bold}
                button:active{transform:scale(0.98)}
            </style>
            </head>
            <body>
                <div class="card">
                    <h3>🔒 访问受限</h3>
                    <p style="color:#666;font-size:14px">请输入密码以继续</p>
                    
                    <div class="input-group">
                        <input type="password" id="pass" placeholder="输入密码..." onkeydown="if(event.key==='Enter')sub()">
                        <span class="eye-icon" onclick="togglePass()">👁️</span>
                    </div>

                    <button onclick="sub()">验 证</button>
                </div>
                <script>
                    // 切换密码显示/隐藏的逻辑
                    function togglePass() {
                        var x = document.getElementById("pass");
                        if (x.type === "password") {
                            x.type = "text";
                        } else {
                            x.type = "password";
                        }
                    }
                    // 提交密码
                    function sub(){
                        var p=document.getElementById('pass').value;
                        if(p){
                            var d=new Date();
                            d.setTime(d.getTime()+(30*864e5)); // 记住30天
                            document.cookie="auth_token="+p+"; expires="+d.toUTCString()+"; path=/";
                            location.reload();
                        }
                    }
                </script>
            </body>
            </html>`, { status: 200, headers: { "Content-Type": "text/html;charset=UTF-8" } });
        }

        const app = getApp(env);
        let response = await app.fetch(request, env, ctx);

        // --- 🔀 自动注入密码逻辑 ---
        if (secretToken && (response.status >= 300 && response.status < 400)) {
            if (isShortLink || userToken === secretToken) {
                const location = response.headers.get("Location");
                if (location) {
                    try {
                        const newLocationUrl = new URL(location, request.url);
                        newLocationUrl.searchParams.set("token", secretToken);
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
