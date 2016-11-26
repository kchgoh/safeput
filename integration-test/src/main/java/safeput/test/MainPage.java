package safeput.test;

import org.openqa.selenium.By;
import org.openqa.selenium.JavascriptExecutor;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;

public class MainPage {
	private final WebDriver driver;
	
	public MainPage(WebDriver driver) {
		this.driver = driver;
	}
	
	public void waitUntilLoaded() {
		(new WebDriverWait(driver, Util.WAIT_TIMEOUT)).until(
				ExpectedConditions.presenceOfElementLocated(By.id("uploadDropzone")));
	}
	
	public WebElement getUploadTab() {
		return driver.findElement(By.linkText("Upload"));
	}
	
	public void openUploadFileBrowser() {
		driver.findElement(By.id("uploadDropzone")).click();
	}
	
	public WebElement getUploadButton() {
		return driver.findElement(By.xpath("//button[text()='Upload']"));
	}
	
	public void selectImagesTab() {
		if(driver.findElement(By.id("imagesTable")).isDisplayed())
			return;
		
		driver.findElement(By.linkText("Images")).click();
		(new WebDriverWait(driver, Util.WAIT_TIMEOUT)).until(
				ExpectedConditions.visibilityOfElementLocated(By.id("imagesTable")));
	}
	
	public WebElement getImageCheckbox(String fileName) {
		WebElement table = driver.findElement(By.id("imagesTable"));
		return table.findElement(By.xpath(".//input[@type='checkbox' and @value='" + fileName + "']"));
	}
	
	public String getImageTag(String fileName) {
		WebElement table = driver.findElement(By.id("imagesTable"));
		WebElement tag = table.findElement(By.xpath(".//tr[td[a[text()='" + fileName + "']]]/td[6]"));
		return tag.getText();
	}
	
	public By getImageDownloadLocator(String fileName) {
		return By.linkText(fileName);
	}
	
	public WebElement getTagButton() {
		return driver.findElement(By.id("imagesTableButtons")).findElement(By.xpath(".//button[text()='Tag']"));
	}
	
	public WebElement getDeleteButton() {
		return driver.findElement(By.id("imagesTableButtons")).findElement(By.xpath(".//button[text()='Delete']"));
	}
	
	public WebElement getLogoutButton() {
		return driver.findElement(By.xpath("//button[text()='Log Out']"));
	}
	
	public void waitPrompt() {
		(new WebDriverWait(driver, Util.WAIT_TIMEOUT)).until(
				ExpectedConditions.visibilityOfElementLocated(By.id("modalPrompt")));
	}
	public WebElement getPromptInput() {
		return driver.findElement(By.id("modalInput"));
	}
	public WebElement getPromptSubmit() {
		return driver.findElement(By.id("modalSubmit"));
	}
}
