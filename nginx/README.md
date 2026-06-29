# nginx

Sample reverse-proxy config for the boilerplate. The Next.js app runs its own
custom `server.js` (HTTP + Socket.IO) on `PORT` (default 3000); nginx sits in
front for TLS termination, large-upload limits, and to correctly upgrade the
`/socket.io/` WebSocket endpoint.

## Install

1. Copy `app.conf` to `/etc/nginx/conf.d/boilerplate.conf` on the host.
2. Edit `server_name` to your domain and the `upstream` `server` line to the
   host:port your app binds to (`127.0.0.1:3000` when running on the same host).
3. Test: `nginx -t`
4. Reload: `nginx -s reload`
5. Add TLS: `certbot --nginx -d your-domain` (certbot rewrites this block to
   listen on 443 and adds an 80→443 redirect).

## Notes

- The `/socket.io/` location MUST be defined before the `/` catch-all and MUST
  set `Upgrade`/`Connection: upgrade` — without it, real-time events silently
  fall back to polling or fail.
- `client_max_body_size` should be >= your max todo attachment size.
- This config is HTTP-only by design; TLS is added by certbot so the cert +
  cipher config live where certbot manages them.
