safeput
============

NodeJS API server / SPA client web application for securely uploading images.
This is a learning exercise for myself - so don't be surprised if it sounds
a bit pointless or that I'm reinventing the wheel (yes, I know there is
passport.js!).



Features / Technicalities
------------
- HTTPS API server: NodeJS / express / handlebars
- SPA client: Plain Javascript and JQuery only, no JS framework; Bootstrap
- SQLite3 database
- Authentication
    - Token-based: JWT (short-lived access token with refresh token)
    - Basic user model and CRUD actions; password store encrypted
	- All endpoints authenticated: upload, image display, file download
- File upload using Dropzone.js
- CRUD actions on images e.g. tag, delete; display as thumbnails
- GUI actions e.g. drag rearrange rows (using JQueryUI)
- Integration test using Selenium (in Java)



Screenshots
-----------

![Login Page](/resources/screenshots/login.png)

![Main Page Upload](/resources/screenshots/upload.png)

![Main Page](/resources/screenshots/main.png)

![Main Tag](/resources/screenshots/tag.png)



Dependencies
------------

- NodeJS v4.5 (although other versions might work).
- npm dependencies: in `/app` , do `npm install`.
- ImageMagick: install as appropriate for your OS. The `convert` binary needs to be either on PATH, or in the app dir.
- Integration test is written in Java - and Maven is needed for build.
- Integration test uses Firefox web driver only. It also requires the Gecko driver (downloadable from Mozilla).



Configuration
-------------

Values can be found in `/app/config.js`. In particular:
- `sitePass` is needed when creating new user.
- `viewsDir` and `resourcesDir` shouldn't be modified unless you move the source files inside too.

The app can run with just the defaults, but of course security-related values should be changed.
Some values can take environment variables, so there should less need to modify the config file. E.g.

    PORT=80 ; node server.js --no-ssl



Run
---

If you have configured SSL: 

    cd {root dir}/app
    node server.js

If not, then start HTTP instead of HTTPS:

    node server.js --no-ssl

Then browse to `https://localhost:8081/` (or http or other port as configured)

