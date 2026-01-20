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
        // --- 🛡️ 智能安保系统 (Cookie + 短链白名单) ---
        const secretToken = env.TOKEN || env.PASSWORD;

        if (secretToken) {
            const url = new URL(request.url);
            
            // 1. 获取 URL 里的 token
            const urlToken = url.searchParams.get("token");
            
            // 2. 获取 Cookie 里的 token
            const cookieHeader = request.headers.get("Cookie") || "";
            const hasCookieToken = cookieHeader.includes(`auth_token=${secretToken}`);

            // 3. 关键判断：
            // 如果 (密码不对) 且 (Cookie里没密码) 且 (不是静态资源) 且 (不是短链接/s/)
            // 只有同时满足这些，才拦截！
            // 👇 我在这里加了 !url.pathname.startsWith("/s/")，给短链接开了绿灯
            if (urlToken !== secretToken && 
                !hasCookieToken && 
                !url.pathname.startsWith("/assets") && 
                !url.pathname.startsWith("/s/")) {
                
                // 返回漂亮的登录界面
                const html = `
                <!DOCTYPE html>
                <html lang="zh-CN">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>🔒 身份验证</title>
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
                        <h2>🔒 私有服务</h2>
                        <p>请登录以生成订阅链接</p>
                        <div class="input-group">
                            <input type="password" id="passwordInput" placeholder="输入密码..." autofocus>
                            <span class="toggle-eye" onclick="toggleVisibility()">👁️</span>
                        </div>
                        <button onclick="submitPass()">登录</button>
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
                            const date = new Date();
                            date.setTime(date.getTime() + (30*24*60*60*1000));
                            document.cookie = "auth_token=" + pass + "; expires=" + date.toUTCString() + "; path=/";
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
