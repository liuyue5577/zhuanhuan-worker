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
        // --- 🛡️ 安全加固逻辑开始 ---
        // 读取 Cloudflare 后台设置的密码 (兼容 TOKEN 或 PASSWORD 变量名)
        const secretToken = env.TOKEN || env.PASSWORD;

        // 如果后台设置了密码，就检查用户是否携带了正确的 ?token=...
        if (secretToken) {
            const url = new URL(request.url);
            const userToken = url.searchParams.get("token");

            // 如果密码不对，且访问的不是静态资源，直接拦截
            if (userToken !== secretToken && !url.pathname.startsWith("/assets")) {
                 return new Response(⛔️ Access Denied: 访问被拒绝\n请在网址后加上 ?token=你的密码, { 
                    status: 403, 
                    headers: { "Content-Type": "text/plain;charset=UTF-8" } 
                });
            }
        }
        // --- 🛡️ 安全加固逻辑结束 ---

        const app = getApp(env);
        return app.fetch(request, env, ctx);
    }
};
