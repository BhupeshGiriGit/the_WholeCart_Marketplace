import { expect, type Locator, type Page } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;

    // Heading "Log in" (h1/h2) - scoped so it doesn't match the submit button
    this.heading = page.locator('h1').filter({ hasText: /^Log in$/ });

    // Several fallbacks, first match wins. Tighten once the real <input> attributes are known.
    this.usernameInput = page.getByTestId("username")
      
    this.passwordInput = page.getByTestId("password")

    this.loginButton =page.getByTestId("login")
    this.errorMessage = page.getByTestId("flash-error")
  }

  async goto(p0: string) {
    await this.page.goto('http://13.200.185.1/c/bhupesh-182de4/');
    await expect(this.page).toHaveTitle(/Log in\s*·\s*WholeCart/);
    await expect(this.usernameInput).toBeVisible();
  }

  async login(username: string, password: string) {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }
}