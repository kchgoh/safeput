package safeput.test;

public class TestApp {

	public static void main(String[] args) throws Exception {
		try(TestRunner runner = new TestRunner("http://localhost:8081")) {
			runner.testAccountCycle();
			runner.testImageActions();
		}
	}
}
