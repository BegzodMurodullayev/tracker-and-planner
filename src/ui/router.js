export function setupRouter({ navButtons, pages, onRouteChange }) {
  const validRoutes = new Set(Array.from(navButtons, (button) => button.dataset.route));

  function activate(route) {
    const resolvedRoute = validRoutes.has(route) ? route : "bosh";

    navButtons.forEach((button) => {
      button.classList.toggle("active", button.dataset.route === resolvedRoute);
    });

    pages.forEach((page) => {
      page.classList.toggle("active", page.dataset.page === resolvedRoute);
    });

    onRouteChange?.(resolvedRoute);
  }

  function resolveHashRoute() {
    const hash = window.location.hash.replace("#", "").trim();
    return validRoutes.has(hash) ? hash : "bosh";
  }

  function goTo(route) {
    const resolvedRoute = validRoutes.has(route) ? route : "bosh";
    if (window.location.hash.replace("#", "") !== resolvedRoute) {
      window.location.hash = resolvedRoute;
      return;
    }

    activate(resolvedRoute);
  }

  navButtons.forEach((button) => {
    button.addEventListener("click", () => goTo(button.dataset.route));
  });

  window.addEventListener("hashchange", () => activate(resolveHashRoute()));
  activate(resolveHashRoute());

  return { goTo };
}
