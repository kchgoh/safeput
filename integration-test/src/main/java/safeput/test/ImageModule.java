package safeput.test;

import java.awt.AWTException;
import java.awt.Robot;
import java.awt.Toolkit;
import java.awt.datatransfer.StringSelection;
import java.awt.event.KeyEvent;
import java.net.URISyntaxException;
import java.nio.file.Paths;

import org.openqa.selenium.By;
import org.openqa.selenium.StaleElementReferenceException;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;

import com.google.common.base.Predicate;

public class ImageModule {
	private final WebDriver driver;
	
	class TestFile {
		public final String fileName = "test.png";
		public final String filePath;
		public TestFile() {
			try {
				filePath = Paths.get(this.getClass().getClassLoader().getResource(fileName).toURI()).toString();
			} catch(URISyntaxException e) {
				throw new RuntimeException("Cannot get file path", e);
			}
		}
	}
	
	private final TestFile testFile = new TestFile();
	
	private final MainPage mainPage;
	
	public ImageModule(WebDriver driver) {
		this.driver = driver;
		this.mainPage = new MainPage(driver);
	}
	
	public void uploadFile() {
		mainPage.getUploadTab().click();
		mainPage.openUploadFileBrowser();
		selectFileWithRobot();
		mainPage.getUploadButton().click();
		mainPage.selectImagesTab();
		(new WebDriverWait(driver, Util.WAIT_TIMEOUT)).until(
				ExpectedConditions.visibilityOfElementLocated(mainPage.getImageDownloadLocator(testFile.fileName)));
	}
	
	private void selectFileWithRobot() {
		try {
			StringSelection stringSelect = new StringSelection(testFile.filePath);
			Toolkit.getDefaultToolkit().getSystemClipboard().setContents(stringSelect, null);
			Robot robot = new Robot();
			Thread.sleep(2000);
			robot.keyPress(KeyEvent.VK_CONTROL);
			robot.keyPress(KeyEvent.VK_V);
			robot.keyRelease(KeyEvent.VK_V);
			robot.keyRelease(KeyEvent.VK_CONTROL);
			Thread.sleep(3000);
			robot.keyPress(KeyEvent.VK_ENTER);
			robot.keyRelease(KeyEvent.VK_ENTER);
			Thread.sleep(2000);
		} catch (AWTException | InterruptedException e) {
			throw new RuntimeException(e);
		}
	}
	
	public void tagImage() {
		mainPage.selectImagesTab();
		mainPage.getImageCheckbox(testFile.fileName).click();
		mainPage.getTagButton().click();
		mainPage.waitPrompt();
		Util.clearAndEnter(mainPage.getPromptInput(), "TestTag");
		mainPage.getPromptSubmit().click();
		
		// submit action will cause the table content to be refreshed
		// if the refresh happens just between "finding the tag cell element" and
		// "checking the text", then WebElement "tag" would be stale.
		// any action on this would cause an exception. but what we want here is just "try
		// until it is there". so if such exception happens (ie table is refreshed)
		// then we just want to eat it and retry. so wrap this check method in a "withRetry".
		// this is kind of a "race condition" because we split the "find" and "check" steps.
		//
		// an alternative would be to do an "atomic" check, like passing a single xpath to that text element,
		// instead of splitting over several statements. but i think the multiple statements are more readable.
		(new WebDriverWait(driver, Util.WAIT_TIMEOUT)).until(withRetry((WebDriver d) -> {
			return mainPage.getImageTag(testFile.fileName).contains("TestTag");
		}));
	}
	
	private static Predicate<WebDriver> withRetry(Predicate<WebDriver> inner) {
		return (WebDriver d) -> {
			try {
				return inner.apply(d);
			} catch(StaleElementReferenceException e) {
				return false;
			}
		};
	}
	
	public void deleteImage() {
		mainPage.selectImagesTab();
		mainPage.getImageCheckbox(testFile.fileName).click();
		mainPage.getDeleteButton().click();
		
		(new WebDriverWait(driver, Util.WAIT_TIMEOUT)).until(
				ExpectedConditions.invisibilityOfElementLocated(mainPage.getImageDownloadLocator(testFile.fileName)));
	}
}
