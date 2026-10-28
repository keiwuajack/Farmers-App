# Production deployment

Use the Render blueprint in `render.yaml` and the production hosting steps in
`README.md`. The older Heroku, DigitalOcean, and EC2 recipes that used to be in
this file were out of date and did not match the app's Node.js requirements.

## Required setup

1. Push the project to a Git repository. Keep `.env` and all credentials out of
   Git; `.gitignore` excludes `.env`.
2. Create a managed MongoDB database and configure its URI as `MONGODB_URI` in
   Render. Allow connections from the Render service.
3. Create the Render Blueprint. It provisions the Node service, health check,
   and persistent disk used for uploaded product images.
4. Set `OPENWEATHER_API_KEY` in Render. `WEATHER_API_KEY` remains accepted as a
   backwards-compatible alias, but new deployments should use the first name.
5. Keep the generated production `JWT_SECRET`. Set `CLIENT_URL` to the final
   HTTPS site URL and set `SMTP_USER` and `SMTP_PASS` to enable password-reset
   email. Until all three are configured, production password resets are
   unavailable.
6. Create the first administrator against the production database. Set
   `MONGODB_URI`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` in a temporary local shell
   environment, then run `node scripts/setupAdminAccess.js`. Do not commit these
   values or use the local development database for this step.
7. Deploy and check `/health`; it should report `status: ok` and a connected
   database. Browser location requires HTTPS (Render provides it).

Production startup does not create demo users, posts, products, or opportunities.
To explicitly seed sample content in a non-production environment, use the
development mode. `SEED_DEMO_DATA=true` can opt into demo data on production,
but should remain unset for a real launch.

The weather panel asks for browser location permission, uses the device's
coordinates for local conditions, and refreshes every 10 minutes while the page
is open. Users can search by town if they deny location access. The browser does
not send coordinates until the user grants location permission.

M-Pesa remains a development simulation and is disabled in production. Do not
advertise or accept real payments until a payment provider and verified callback
handling are implemented. Uploaded images require persistent storage mounted at
`UPLOAD_DIR` on any host.
