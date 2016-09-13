package safeput.test;

import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;

public class LoginPage {
	private final WebDriver driver;
	
	public LoginPage(WebDriver driver) {
		this.driver = driver;
	}
	
	public void waitUntilLoaded() {
		(new WebDriverWait(driver, Util.WAIT_TIMEOUT)).until(
				ExpectedConditions.visibilityOfElementLocated(By.id("loginForm")));
	}
	
	public WebElement getLoginButton() {
		return driver.findElement(By.xpath(".//button[text()='Log In']"));
	}
	public WebElement getCreateAccountLink() {
		return driver.findElement(By.partialLinkText("Create Account"));
	}
	public WebElement getChangePasswordLink() {
		return driver.findElement(By.partialLinkText("Change Password"));
	}
	public WebElement getDeleteAccountLink() {
		return driver.findElement(By.partialLinkText("Delete Account"));
	}
	public WebElement getUsernameInput() {
		WebElement form = driver.findElement(By.id("loginForm"));
		return form.findElement(By.name("username"));
	}
	public WebElement getPasswordInput() {
		WebElement form = driver.findElement(By.id("loginForm"));
		return form.findElement(By.name("password"));
	}
	public String getMessage() {
		return driver.findElement(By.id("message")).getText();
	}
	
	public Prompt waitPrompt() {
		(new WebDriverWait(driver, Util.WAIT_TIMEOUT)).until(
				ExpectedConditions.visibilityOfElementLocated(By.id("promptForm")));
		return new Prompt();
	}
	
	class Prompt {
		public WebElement getUsernameInput() {
			return findByName("username");
		}
		public WebElement getPasswordInput() {
			return findByName("password");
		}
		public WebElement getNewPasswordInput() {
			return findByName("newPassword");
		}
		public WebElement getSitePassInput() {
			return findByName("sitePass");
		}
		private WebElement findByName(String name) {
			WebElement form = driver.findElement(By.id("promptForm"));
			return form.findElement(By.name(name));
		}
		public WebElement getSubmitButton() {
			WebElement form = driver.findElement(By.id("promptForm"));
			return form.findElement(By.xpath(".//button[@type='submit']"));			
		}
	}
}
