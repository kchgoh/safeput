module.exports = {
	jwtSecret: process.env.JWT_SECRET || "default",
	sitePass: process.env.SITE_PASS || "hi",
	accessTokenExpire: 60,	// in sec
	refreshTokenExpire: 300,
	downloadTokenExpire: 10,
	port: process.env.PORT || "8081",
	viewsDir: "views",
	resourcesDir: "public",
	filesDir: "uploads",
	thumbnailsDir: "thumbnails",
	tmpDir: "tmp",
	dbFilePath: "database/store.db",
	sslKeyPath: process.env.SSL_KEY_PATH || "../../keys/ssl.key",
	sslCertPath: process.env.SSL_CERT_PATH || "../../keys/ssl.crt"
};
