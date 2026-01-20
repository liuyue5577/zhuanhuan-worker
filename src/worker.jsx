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
        // --- 🛡️ 密码门卫逻辑 (带可视化界面 + 显隐切换) ---
        const secretToken = env.TOKEN || env.PASSWORD;

        if (secretToken) {
            const url = new URL(request.url);
            const userToken = url.searchParams.get("token");

            if (userToken !== secretToken && !url.pathname.startsWith("/assets")) {
                const html = `
                <!DOCTYPE html>
                <html lang="zh-CN">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>🔒 访问验证</title>
                    <style>
                        body {
                            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                            display: flex; justify-content: center; align-items: center;
                            height: 100vh; margin: 0; background-color: #f0f2f5;
                        }
                        .card {
                            background: white; padding: 2.5rem; border-radius: 16px;
                            box-shadow: 0 10px 25px rgba(0,0,0,0.05); text-align: center; width: 100%; max-width: 360px;
                        }
                        h2 { margin: 0 0 10px; color: #1a1a1a; font-size: 1.6rem; }
                        p { color: #666; margin-bottom: 2rem; font-size: 0.95rem; }
                        
                        /* 输入框容器，用于定位小眼睛 */
                        .input-group {
                            position: relative; margin-bottom: 1.5rem;
                        }
                        input {
                            width: 100%; padding: 14px 45px 14px 14px; /* 右边留出空位给眼睛 */
                            border: 1px solid #e1e4e8; border-radius: 10px; box-sizing: border-box;
                            font-size: 1rem; outline: none; transition: all 0.2s; background: #fafafa;
                        }
                        input:focus { border-color: #0070f3; background: #fff; box-shadow: 0 0 0 3px rgba(0,112,243,0.1); }
                        
                        /* 小眼睛图标样式 */
                        .toggle-eye {
                            position: absolute; right: 15px; top: 50%; transform: translateY(-50%);
                            cursor: pointer; font-size: 1.2rem; user-select: none; opacity: 0.5;
                        }
                        .toggle-eye:hover { opacity: 0.8; }

                        button {
                            width: 100%; padding: 14px; background-color: #0070f3;
                            color: white; border: none; border-radius: 10px;
                            font-size: 1rem; cursor: pointer; font-weight: 600;
                            transition: background 0.2s;
                        }
                        button:hover { background-color: #0051a2; }
                    </style>
                </head>
                <body>
                    <div class="card">
                        <h2>🔒 私有服务</h2>
                        <p>请输入密码以验证身份</p>
                        
                        <div class="input-group">
                            <input type="password" id="passwordInput" placeholder="请输入密码..." autofocus>
                            <span class="toggle-eye" onclick="toggleVisibility()">👁️</span>
                        </div>

                        <button onclick="submitPass()">验证进入</button>
                    </div>

                    <script>
                        // 切换密码显示/隐藏
                        function toggleVisibility() {
                            const input = document.getElementById('passwordInput');
                            const eye = document.querySelector('.toggle-eye');
                            if (input.type === "password") {
                                input.type = "text";
                                eye.textContent = "🙈"; // 切换成闭眼图标
                            } else {
                                input.type = "password";
                                eye.textContent = "👁️"; // 切换回睁眼图标
                            }
                        }

                        function submitPass() {
                            const pass = document.getElementById('passwordInput').value;
                            if(!pass) return;
                            const url = new URL(window.location.href);
                            url.searchParams.set('token', pass);
                            window.location.href = url.toString();
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
