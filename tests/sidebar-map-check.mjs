import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const baseUrl = process.env.BASE_URL || "http://localhost:3000";
const screenshotDir = path.join(process.cwd(), "tests", "screenshots");
await fs.mkdir(screenshotDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });

try {
  await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForFunction(() => document.querySelector('input[type="password"]') || document.querySelector(".workspace"), { timeout: 30000 });
  const password = page.locator('input[type="password"]:visible').first();
  if (await password.count()) {
    await password.fill("Temporal2026");
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
  }
  await page.getByText("Panel principal", { exact: true }).waitFor({ state: "visible", timeout: 30000 });

  const sidebarWidth = await page.locator(".sidebar").evaluate((element) => Math.round(element.getBoundingClientRect().width));
  if (sidebarWidth < 250) throw new Error(`El sidebar no tiene el ancho ampliado esperado: ${sidebarWidth}px`);
  const sidebarOverflow = await page.locator(".sidebar").evaluate((element) => ({ clientWidth: element.clientWidth, scrollWidth: element.scrollWidth }));
  if (sidebarOverflow.scrollWidth > sidebarOverflow.clientWidth + 1) throw new Error(`El sidebar mantiene desplazamiento horizontal: ${sidebarOverflow.scrollWidth}px frente a ${sidebarOverflow.clientWidth}px`);
  const groupTitleStyle = await page.locator(".sidebar-group-title").first().evaluate((element) => { const style = getComputedStyle(element); const icon = element.querySelector("span"); const iconStyle = icon ? getComputedStyle(icon) : null; return { fontWeight: Number(style.fontWeight), backgroundColor: style.backgroundColor, iconDisplay: iconStyle?.display, iconHeight: iconStyle?.height }; });
  if (groupTitleStyle.fontWeight < 700 || groupTitleStyle.backgroundColor === "rgba(0, 0, 0, 0)" || !["grid", "inline-grid"].includes(groupTitleStyle.iconDisplay) || groupTitleStyle.iconHeight !== "20px") throw new Error("Los títulos o iconos de grupo del sidebar no tienen la alineación visual esperada");
  const inicio = page.locator('.sidebar > .nav-item').filter({ hasText: "Inicio" });
  const envios = page.locator('.sidebar-group .nav-item').filter({ hasText: "Envíos" });
  const inicioHeight = await inicio.evaluate((element) => Math.round(element.getBoundingClientRect().height));
  const enviosHeight = await envios.evaluate((element) => Math.round(element.getBoundingClientRect().height));
  if (inicioHeight !== enviosHeight || inicioHeight < 30) throw new Error(`Inicio no está alineado: ${inicioHeight}px frente a Envíos ${enviosHeight}px`);
  await page.screenshot({ path: path.join(screenshotDir, "sidebar-wide-desktop.png"), fullPage: false });
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.waitForTimeout(250);
  const tabletSidebarWidth = await page.locator(".sidebar").evaluate((element) => Math.round(element.getBoundingClientRect().width));
  if (tabletSidebarWidth < 44 || tabletSidebarWidth > 54) throw new Error(`El botón circular de menú de tablet no tiene el tamaño esperado: ${tabletSidebarWidth}px`);
  const tabletTogglePosition = await page.locator(".mobile-sidebar-toggle").evaluate((element) => { const rect = element.getBoundingClientRect(); const actions = document.querySelector(".appbar-actions")?.getBoundingClientRect(); return { top: Math.round(rect.top), right: Math.round(window.innerWidth - rect.right), left: Math.round(rect.left), actionsRight: actions ? Math.round(actions.right) : 0, userVisible: getComputedStyle(element.querySelector(".mobile-sidebar-user")).display !== "none" }; });
  if (tabletTogglePosition.top < 8 || tabletTogglePosition.top > 12 || tabletTogglePosition.right < 10 || tabletTogglePosition.right > 14 || tabletTogglePosition.userVisible || tabletTogglePosition.left < tabletTogglePosition.actionsRight) throw new Error("El menú circular de tablet no está integrado arriba a la derecha, invade la cabecera o muestra el usuario fuera del desplegable");
  if (await page.locator(".mobile-sidebar-hamburger i").count() !== 3 || await page.locator(".mobile-sidebar-toggle-text:visible").count()) throw new Error("El botón de menú de tablet no muestra solo el icono de hamburguesa");
  if (await page.locator(".sidebar:not(.mobile-open) .sidebar-footer").isVisible()) throw new Error("La versión aparece fuera del menú de hamburguesa en tablet");
  await page.locator(".mobile-sidebar-toggle").click();
  await page.locator(".sidebar.mobile-open").waitFor({ state: "visible", timeout: 5000 });
  const tabletPanelTop = await page.locator(".sidebar.mobile-open").evaluate((element) => Math.round(element.getBoundingClientRect().top));
  if (tabletPanelTop !== 74) throw new Error(`El desplegable de tablet no empieza bajo la cabecera: ${tabletPanelTop}px`);
  const tabletPanelScroll = await page.locator(".sidebar.mobile-open").evaluate((element) => ({ scrollHeight: element.scrollHeight, clientHeight: element.clientHeight, scrollbar: getComputedStyle(element).scrollbarWidth }));
  if (tabletPanelScroll.scrollHeight > tabletPanelScroll.clientHeight + 1 || tabletPanelScroll.scrollbar !== "none") throw new Error(`El menú tablet muestra desplazamiento innecesario: ${tabletPanelScroll.scrollHeight}px frente a ${tabletPanelScroll.clientHeight}px`);
  if (!(await page.locator(".mobile-sidebar-account").isVisible()) || !(await page.locator(".mobile-sidebar-account > span b").isVisible()) || !(await page.locator(".mobile-sidebar-account > span small").isVisible())) throw new Error("El usuario y su rol no aparecen dentro del menú de tablet");
  if (!(await page.locator(".mobile-sidebar-account").evaluate((element) => element.nextElementSibling?.classList.contains("sidebar-footer")))) throw new Error("El bloque de usuario no precede al pie del menú de tablet");
  if (!(await page.locator(".sidebar.mobile-open > .sidebar-footer").evaluate((element) => element === element.parentElement?.lastElementChild))) throw new Error("La versión no está al final del menú de tablet");
  await page.locator(".sidebar.mobile-open .sidebar-group-title").first().click();
  const tabletMenuFontSize = await page.locator(".sidebar.mobile-open .sidebar-group .nav-item").first().evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize));
  if (tabletMenuFontSize < 18) throw new Error(`La tipografía del menú de tablet no se ha ampliado: ${tabletMenuFontSize}px`);
  await page.screenshot({ path: path.join(screenshotDir, "sidebar-wide-tablet.png"), fullPage: false });
  await page.locator(".mobile-sidebar-toggle").click();
  await page.setViewportSize({ width: 812, height: 375 });
  await page.waitForTimeout(250);
  if (await page.locator(".sidebar:not(.mobile-open) .sidebar-footer").isVisible()) throw new Error("La versión aparece fuera del menú en móvil horizontal");
  await page.locator(".mobile-sidebar-toggle").click();
  await page.locator(".sidebar.mobile-open").waitFor({ state: "visible", timeout: 5000 });
  if (!(await page.locator(".sidebar.mobile-open > .sidebar-footer").evaluate((element) => element === element.parentElement?.lastElementChild))) throw new Error("La versión no termina el menú en móvil horizontal");
  await page.locator(".mobile-sidebar-toggle").click();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(250);

  if (baseUrl.includes("localhost")) {
    console.log(`PASS sidebar local: ${sidebarWidth}px · Inicio ${inicioHeight}px · altura alineada`);
  } else {
    const pedidos = page.getByRole("button", { name: "Pedidos", exact: true }).last();
    if (!(await pedidos.isVisible())) await page.locator(".sidebar-group-title").first().click();
    await pedidos.click();
    await page.getByRole("heading", { name: "Pedidos", exact: true }).waitFor({ state: "visible", timeout: 30000 });
    const mapAction = page.locator('.delivery-map-panel .map-action');
    const search = page.getByPlaceholder("Buscar en columnas principales...").first();
    await search.fill("PW-TEST-ORDER-20260827-01");
    await page.waitForTimeout(700);
    await page.getByText("PW-TEST-ORDER-20260827-01", { exact: true }).first().click();
    await mapAction.waitFor({ state: "visible", timeout: 15000 });
    if (await mapAction.getAttribute("aria-label") !== "Buscar dirección en Google Maps") throw new Error("El icono de mapa no tiene la etiqueta accesible esperada");
    if (!(await mapAction.getAttribute("href"))?.startsWith("https://www.google.com/maps/")) throw new Error("El icono de mapa no abre Google Maps");
    if (!(await mapAction.locator(".toolbar-action-icon").count())) throw new Error("Falta el icono de mapa en el detalle del pedido");
    await page.screenshot({ path: path.join(screenshotDir, "sidebar-map-order-desktop.png"), fullPage: false });
  }
  if (errors.length) throw new Error(`Errores de consola: ${errors.join(" | ")}`);
  console.log(`PASS sidebar/map: ${sidebarWidth}px · Inicio ${inicioHeight}px · icono de mapa accesible`);
} catch (error) {
  await page.screenshot({ path: path.join(screenshotDir, "sidebar-map-failed.png"), fullPage: false }).catch(() => undefined);
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
