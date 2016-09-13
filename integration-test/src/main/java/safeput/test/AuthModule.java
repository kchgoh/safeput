package safeput.test;

import org.openqa.selenium.WebDriver;
import org.openqa.selenium.support.ui.WebDriverWait;

public class AuthModule {
	private final WebDriver driver;
	private final LoginPage loginPage;
	private final MainPage mainPage;
	
	class LoginDetails {
		public final String userName;
		public final String password;
		public LoginDetails(String userName, String password) {
			this.userName = userName;
			this.password = password;
		}
	}
	
	private final String sitePass;
	private final LoginDetails testerLogin;
	private final LoginDetails tmpLogin = new LoginDetails("tmpUser", "123");
	
	public AuthModule(WebDriver driver) {
		sitePass = System.getProperty("site.pass");
		String testerLoginName = System.getProperty("tester.name");
		String testerLoginPassword = System.getProperty("tester.pwd");
		if(sitePass == null || testerLoginName == null || testerLoginPassword == null)
			throw new RuntimeException("Missing auth properties");
		testerLogin = new LoginDetails(testerLoginName, testerLoginPassword);
		this.driver = driver;
		loginPage = new LoginPage(driver);
		mainPage = new MainPage(driver);
	}
	
	public void testAccountCycle() {
		waitLoginPage();
		createAccount(tmpLogin);
		changePassword(tmpLogin, "def");
		deleteAccount(new LoginDetails(tmpLogin.userName, "def"));
		
		createAccount(tmpLogin);
		login(tmpLogin);
		logout();
		deleteAccount(tmpLogin);
	}
	
	public void waitLoginPage() {
		loginPage.waitUntilLoaded();
	}
	
	private void createAccount(LoginDetails l) {
		loginPage.getCreateAccountLink().click();
		LoginPage.Prompt prompt = loginPage.waitPrompt();
		Util.clearAndEnter(prompt.getUsernameInput(), l.userName);
		Util.clearAndEnter(prompt.getPasswordInput(), l.password);
		Util.clearAndEnter(prompt.getSitePassInput(), sitePass);
		prompt.getSubmitButton().click();
		
		(new WebDriverWait(driver, Util.WAIT_TIMEOUT)).until((WebDriver d) -> {
			String message = loginPage.getMessage();
			System.out.println("Action returned: " + message);
			return message.toUpperCase().contains("SUCCESS");
		});
	}
	
	private void changePassword(LoginDetails l, String newPassword) {
		loginPage.getChangePasswordLink().click();
		LoginPage.Prompt prompt = loginPage.waitPrompt();
		Util.clearAndEnter(prompt.getUsernameInput(), l.userName);
		Util.clearAndEnter(prompt.getPasswordInput(), l.password);
		Util.clearAndEnter(prompt.getNewPasswordInput(), newPassword);
		prompt.getSubmitButton().click();
		
		(new WebDriverWait(driver, Util.WAIT_TIMEOUT)).until((WebDriver d) -> {
			String message = loginPage.getMessage();
			System.out.println("Action returned: " + message);
			return message.toUpperCase().contains("SUCCESS");
		});
	}
	
	private void deleteAccount(LoginDetails l) {
		Util.clearAndEnter(loginPage.getUsernameInput(), l.userName);
		Util.clearAndEnter(loginPage.getPasswordInput(), l.password);
		loginPage.getDeleteAccountLink().click();
		(new WebDriverWait(driver, Util.WAIT_TIMEOUT)).until((WebDriver d) -> {
			String message = loginPage.getMessage();
			System.out.println("Action returned: " + message);
			return message.toUpperCase().contains("SUCCESS");
		});
	}
	
	public void login() {
		login(this.testerLogin);
	}
	
	public void login(LoginDetails l) {
		Util.clearAndEnter(loginPage.getUsernameInput(), l.userName);
		Util.clearAndEnter(loginPage.getPasswordInput(), l.password);
		loginPage.getLoginButton().click();
		mainPage.waitUntilLoaded();
	}
	
	public void wrongUserReject() {
		Util.clearAndEnter(loginPage.getUsernameInput(), testerLogin.userName);
		Util.clearAndEnter(loginPage.getPasswordInput(), "foo");
		loginPage.getLoginButton().click();
		(new WebDriverWait(driver, Util.WAIT_TIMEOUT)).until((WebDriver d) -> {
			String message = loginPage.getMessage();
			System.out.println("Action returned: " + message);
			return message.toUpperCase().contains("WRONG");
		});
	}
	
	public void wrongPasswordReject() {
		Util.clearAndEnter(loginPage.getUsernameInput(), "foo");
		Util.clearAndEnter(loginPage.getPasswordInput(), "bar");
		loginPage.getLoginButton().click();
		(new WebDriverWait(driver, Util.WAIT_TIMEOUT)).until((WebDriver d) -> {
			String message = loginPage.getMessage();
			System.out.println("Action returned: " + message);
			return message.toUpperCase().contains("WRONG");
		});
	}
	
	public void logout() {
		mainPage.getLogoutButton().click();
		waitLoginPage();
	}
}
