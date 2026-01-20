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
        // --- 🛡️ 安全加固逻辑 ---
        const secretToken = env.TOKEN || env.PASSWORD;

        if (secretToken) {
            const url = new URL(request.url);
            const userToken = url.searchParams.get("token");

            if (userToken !== secretToken && !url.pathname.startsWith("/assets")) {
                // 👇 注意：下面这一行已经加好了双引号，不会再报错了
                return new Response("⛔ Access Denied: 访问被拒绝\n请在网址后加上 ?token=你的密码", { 
                    status: 403, 
                    headers: { "Content-Type": "text/plain;charset=UTF-8" } 
                });
            }
        }
        // --- 🛡️ 结束 ---

        const app = getApp(env);
        return app.fetch(request, env, ctx);
    }
};
