module.exports = {
	jwtSecret: "default",
	sitePass: "hi",
	accessTokenExpire: 60,	// in sec
	refreshTokenExpire: 300,
	downloadTokenExpire: 10,
	port: "8081",
	viewsDir: "views",
	resourcesDir: "public",
	filesDir: "uploads",
	thumbnailsDir: "thumbnails",
	tmpDir: "tmp",
	dbFilePath: "database/store.db",
	sslKeyPath: "../../keys/ssl.key",
	sslCertPath: "../../keys/ssl.crt"
};
