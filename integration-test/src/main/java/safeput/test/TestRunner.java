package safeput.test;

import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.firefox.FirefoxDriver;
import org.openqa.selenium.firefox.FirefoxProfile;

public class TestRunner implements AutoCloseable {
	
	private final String frontPageURL;
	private final WebDriver driver;

	public TestRunner(String frontPageURL) {
		this.frontPageURL = frontPageURL;
		FirefoxProfile fp = new FirefoxProfile();
		fp.setAcceptUntrustedCertificates(true);
		fp.setAssumeUntrustedCertificateIssuer(false);
		driver = new FirefoxDriver(fp);
	}
	
	public void testAccountCycle() {
		AuthModule auth = new AuthModule(driver);
		driver.get(frontPageURL);
		auth.testAccountCycle();
		
		driver.get(frontPageURL);
		auth.waitLoginPage();
		auth.wrongUserReject();
		
		driver.get(frontPageURL);
		auth.waitLoginPage();
		auth.wrongPasswordReject();
	}
	
	public void testImageActions() {
		AuthModule auth = new AuthModule(driver);
		ImageModule img = new ImageModule(driver);
		driver.get(frontPageURL);
		auth.waitLoginPage();
		auth.login();
		img.uploadFile();
		img.tagImage();
		img.deleteImage();
		auth.logout();
	}
	
	
	@Override
	public void close() throws Exception {
		driver.quit();
	}
}

class Util {
	public static final int WAIT_TIMEOUT = 8;
	public static void clearAndEnter(WebElement e, String value) {
		e.clear();
		e.sendKeys(value);
	}
}