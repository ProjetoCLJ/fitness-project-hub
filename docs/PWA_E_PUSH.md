# PWA e notificações push — MyJourn

Referência baseada no guia do app "Academy China 2026" (mesmo padrão). **PWA instalável: aplicado.
Notificações push: guardado para quando formos ativar** (o service worker já tem os handlers, mas
nada cria inscrições ainda).

## 1. O que já está aplicado (PWA instalável)

| Item | Onde |
|---|---|
| Manifesto (nome MyJourn, `standalone`, `start_url: /?standalone=1`, tema `#161A1D`) | `public/manifest.json` |
| Ícones 192/512, maskable 192/512 e `apple-touch-icon` (símbolo verde sobre fundo escuro) | `public/icons/` |
| Service worker mínimo, **sem cache offline** (+ handlers de push prontos) | `public/sw.js` |
| Tags `theme-color`, `manifest`, `apple-touch-icon`, `apple-mobile-web-app-*`, `viewport-fit=cover` | `index.html` |
| Registro do service worker (só no site publicado e fora de iframe) | `src/main.tsx` |
| Dica de instalação (celular, só no navegador, uma vez, na landing) | `src/components/InstallPrompt.tsx` |

Decisões:
- `?standalone=1` no `start_url` + `display-mode: standalone` + `navigator.standalone` → o app sabe que está instalado e não mostra a dica.
- iOS: só o **Safari** instala (Chrome/Firefox no iPhone não). A dica avisa isso.
- Android: se o navegador oferece `beforeinstallprompt`, a dica mostra o botão "Instalar agora"; senão, mostra os passos manuais.
- Sem cache no service worker: o app sempre carrega a versão mais nova (evita "app preso em versão antiga").
- Status bar do iOS `black` (não `black-translucent`) para não cobrir o header; se usar translucent, aplicar `env(safe-area-inset-*)`.
- Ícone `maskable` separado, com o símbolo na zona segura (~50%).

Como testar: publicar o app (HTTPS), abrir no celular → iPhone: Safari > Compartilhar > Adicionar à Tela de Início; Android: ⋮ > Instalar aplicativo.

## 2. Notificações push (guardado, ainda não ativado)

### Pré-requisitos
- HTTPS. Chaves **VAPID** (`npx web-push generate-vapid-keys`): pública no front; privada só no servidor.
  Variáveis do servidor: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (`mailto:...`).
- iPhone: só com o app **instalado** e iOS 16.4+. Android/Chrome: aba ou instalado (via FCM).
- Pedir permissão sempre dentro de um **clique**; mostrar antes um modal próprio ("Ativar notificações?") para não gastar o pedido nativo.

### Banco (adaptar ao nosso Supabase — usar `auth.users`)
```sql
CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
-- cada pessoa só grava/apaga a própria inscrição
CREATE POLICY "own insert" ON public.push_subscriptions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own delete" ON public.push_subscriptions FOR DELETE TO authenticated USING (auth.uid() = user_id);
-- GRANT SELECT/INSERT/DELETE a authenticated; ALL a service_role
```
Histórico opcional: `push_notifications` (title, body, target, sent_count, failed_count, sent_by) e
`push_notification_recipients` (notification_id, user, status: sent|failed|not_subscribed).

### Cliente (inscrever o aparelho)
```js
const VAPID_PUBLIC_KEY = '...';
const urlBase64ToUint8Array = (b64) => {
  const pad = '='.repeat((4 - b64.length % 4) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
};
const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window;

async function enablePush() {
  if (!pushSupported()) return;
  if ((await Notification.requestPermission()) !== 'granted') return;   // dentro de um clique
  const reg = await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) }));
  // enviar sub.toJSON() ({endpoint, keys:{p256dh, auth}}) para o servidor salvar em push_subscriptions
}
```
Estados úteis para o botão Ativar/Desativar no perfil: `unsupported`, `denied` (Notification.permission), `subscribed`, `unsubscribed`.
`userVisibleOnly: true` exige que **todo** push mostre uma notificação (o `sw.js` já faz isso).

### Servidor
Duas operações: (1) salvar/remover inscrição (validar o token do usuário; gravar com chave de serviço);
(2) enviar (só admin/regra do app): buscar inscrições, montar `{title, body, url}`, criptografar (RFC 8291 aes128gcm)
e assinar VAPID ES256 (RFC 8292), `POST` no `endpoint` com `ttl: 86400`. Respostas **404/410** = inscrição morta → apagar a linha.

Para o nosso app (Vite SPA no Lovable/Supabase) o caminho natural é uma **Supabase Edge Function** (Deno).
Lá **não usar a lib `web-push`** (quebra em ambiente edge por causa do `asn1.js`); usar um módulo próprio com
Web Crypto + `fetch` (o guia original traz `webpush-edge.ts`: HKDF para chave/nonce, AES-GCM com registro de padding `0x02`,
cabeçalho `salt(16) | rs=4096 | idlen | chave pública efêmera`, e o JWT ES256 do VAPID com `aud` = origem do endpoint).

### Armadilhas
1. `web-push` não roda em edge/Workers; em Node comum funciona.
2. iPhone: instalar + iOS 16.4+; teste só em aparelho real.
3. China/sem VPN: Android usa FCM (Google) e pode não receber; iPhone (APNs) tende a funcionar.
4. Permissão só por clique; modal próprio antes do pedido nativo; guardar em `localStorage` que o convite já foi mostrado.
5. `sw.js` precisa estar na **raiz** para controlar o site todo.
6. Chave de serviço do Supabase nunca no navegador.
7. Inscrições expiram (limpar dados, desinstalar): tratar 404/410.
8. Inscrição no preview não vale para o site publicado (endereços diferentes): ativar no mesmo endereço em que vai disparar.
9. Sem cache offline = sempre versão nova; se adicionar cache, planejar invalidação por versão.

### Roteiro de teste (quando ativarmos)
Instalar no celular → login → aceitar o convite → conferir 1 linha em `push_subscriptions` → disparar para o usuário →
ver se chegou e se o toque abre/foca o app. Se não chegou: olhar `sent`/`failed` e o status do serviço (401/403 = VAPID não confere; 404/410 = expirada).
