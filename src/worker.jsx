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
    fetch(request, env, ctx) {
        // --- 🛡️ 隐形密码门卫逻辑 (Cookie版) ---
        const secretToken = env.TOKEN || env.PASSWORD;

        if (secretToken) {
            const url = new URL(request.url);
            
            // 1. 尝试从网址获取 token (兼容旧方式，比如在 Clash 软件里填订阅链接时需要这个)
            const urlToken = url.searchParams.get("token");
            
            // 2. 尝试从浏览器 Cookie 获取 token (这是为了隐藏网址密码)
            const cookieHeader = request.headers.get("Cookie") || "";
            // 简单检查 Cookie 中是否包含 "auth_token=你的密码"
            const hasCookieToken = cookieHeader.includes(`auth_token=${secretToken}`);

            // 3. 校验：如果网址没带密码，且 Cookie 里也没存密码，且不是静态资源 -> 拦截
            if (urlToken !== secretToken && !hasCookieToken && !url.pathname.startsWith("/assets")) {
                const html = `
                <!DOCTYPE html>
                <html lang="zh-CN">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>🔒 安全访问</title>
                    <style>
                        body {
                            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                            display: flex; justify-content: center; align-items: center;
                            height: 100vh; margin: 0; background-color: #f0f2f5;
                        }
                        .card {
                            background: white; padding: 2.5rem; border-radius: 16px;
                            box-shadow: 0 10px 25px rgba(0,0,0,0.05); text-align: center; width: 100%; max-width: 360px;
                        }
                        h2 { margin: 0 0 10px; color: #1a1a1a; font-size: 1.6rem; }
                        p { color: #666; margin-bottom: 2rem; font-size: 0.95rem; }
                        .input-group { position: relative; margin-bottom: 1.5rem; }
                        input {
                            width: 100%; padding: 14px 45px 14px 14px;
                            border: 1px solid #e1e4e8; border-radius: 10px; box-sizing: border-box;
                            font-size: 1rem; outline: none; transition: all 0.2s; background: #fafafa;
                        }
                        input:focus { border-color: #0070f3; background: #fff; }
                        .toggle-eye {
                            position: absolute; right: 15px; top: 50%; transform: translateY(-50%);
                            cursor: pointer; font-size: 1.2rem; user-select: none; opacity: 0.5;
                        }
                        button {
                            width: 100%; padding: 14px; background-color: #0070f3;
                            color: white; border: none; border-radius: 10px;
                            font-size: 1rem; cursor: pointer; font-weight: 600; transition: background 0.2s;
                        }
                        button:hover { background-color: #0051a2; }
                    </style>
                </head>
                <body>
                    <div class="card">
                        <h2>🔒 身份验证</h2>
                        <p>请输入密码以继续</p>
                        <div class="input-group">
                            <input type="password" id="passwordInput" placeholder="输入密码..." autofocus>
                            <span class="toggle-eye" onclick="toggleVisibility()">👁️</span>
                        </div>
                        <button onclick="submitPass()">验证并记住我</button>
                    </div>
                    <script>
                        function toggleVisibility() {
                            const input = document.getElementById('passwordInput');
                            const eye = document.querySelector('.toggle-eye');
                            if (input.type === "password") {
                                input.type = "text"; eye.textContent = "🙈";
                            } else {
                                input.type = "password"; eye.textContent = "👁️";
                            }
                        }

                        function submitPass() {
                            const pass = document.getElementById('passwordInput').value;
                            if(!pass) return;
                            
                            // 关键修改：不再修改网址，而是存入 Cookie (有效期30天)
                            const date = new Date();
                            date.setTime(date.getTime() + (30*24*60*60*1000));
                            document.cookie = "auth_token=" + pass + "; expires=" + date.toUTCString() + "; path=/";
                            
                            // 刷新页面，此时有了 Cookie 就会自动进入
                            location.reload();
                        }
                        
                        document.getElementById('passwordInput').addEventListener("keypress", function(event) {
                            if (event.key === "Enter") submitPass();
                        });
                    </script>
                </body>
                </html>
                `;

                return new Response(html, { 
                    status: 200, 
                    headers: { "Content-Type": "text/html;charset=UTF-8" } 
                });
            }
        }
        // --- 🛡️ 结束 ---

        const app = getApp(env);
        return app.fetch(request, env, ctx);
    }
};
