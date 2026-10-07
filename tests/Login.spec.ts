import { expect, test } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage.ts';
// @ts-ignore - shared test users are defined outside the TS project scope
import { ALL_USERS, PASSWORD } from '../testData/Users.ts';

test.describe('WholeCart - Login', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto("http://13.200.185.1/c/bhupesh-182de4/login");
  });

  test('login page renders all elements', async () => {
    await expect(loginPage.heading).toBeVisible();
    await expect(loginPage.usernameInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.loginButton).toBeEnabled();
    await expect(loginPage.errorMessage).toBeHidden();
  });

  // Positive: every user can log in with the shared password
  for (const username of ALL_USERS) {
    test(`valid login: ${username}`, async ({ page }) => {
      await loginPage.login(username, PASSWORD);

      // Successful login should leave the login page and show no error
      await expect(page).not.toHaveURL(/\/login/);
      await expect(loginPage.errorMessage).toBeHidden();
    });
  }

  test('invalid password shows error', async ({ page }) => {
    await loginPage.login('buyer1', 'WrongPass@123');

    await expect(loginPage.errorMessage).toBeVisible();
    await expect(page).toHaveURL(/\/login\?error=Wrong%20username%20or%20password/);
  });

  test('invalid username shows error', async () => {
    await loginPage.login('unknown_user', PASSWORD);
    await expect(loginPage.errorMessage).toBeVisible();
  });

  test('empty credentials do not log in', async ({ page }) => {
    await loginPage.loginButton.click();
    await expect(page).toHaveURL(/\/login/);
  });

  test('password is case-sensitive', async () => {
    await loginPage.login('buyer1', PASSWORD.toLowerCase());
    await expect(loginPage.errorMessage).toBeVisible();
  });
});